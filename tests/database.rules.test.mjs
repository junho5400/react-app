import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';

let environment;
const course = { title: 'Alpha', term: 'Fall', number: '101', meets: 'MWF 9:00-9:50' };
const dbFor = (uid) => uid
  ? environment.authenticatedContext(uid, { email: 'admin@example.com' }).database()
  : environment.unauthenticatedContext().database();

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-course-scheduler',
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'),
    },
  });
});
after(async () => { await environment?.cleanup(); });
beforeEach(async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await context.database().ref().set({
      schedule: { title: 'Schedule', courses: { A: course, B: course } },
      admins: { administrator: true, member: false, string: 'true', numeric: 1, object: { role: true } },
    });
  });
});

test('schedule is publicly readable for guests and all signed-in roles', async () => {
  for (const uid of [null, 'member', 'administrator']) {
    await assertSucceeds(dbFor(uid).ref('schedule').once('value'));
  }
});

test('only a UID whose membership is boolean true can write courses', async () => {
  for (const uid of [null, 'member', 'missing', 'string', 'numeric', 'object']) {
    await assertFails(dbFor(uid).ref('schedule/courses/A').update({ title: 'Changed' }));
  }
  await assertSucceeds(dbFor('administrator').ref('schedule/courses/A').update({ title: 'Changed' }));
});

test('existing course validation is enforced for administrators', async () => {
  await assertFails(dbFor('administrator').ref('schedule/courses/C').set({ title: 'Incomplete' }));
  await assertFails(dbFor('administrator').ref('schedule/courses/A/title').remove());
  await assertSucceeds(dbFor('administrator').ref('schedule/courses/C').set(course));
});

test('membership reads are restricted to the authenticated owner', async () => {
  await assertSucceeds(dbFor('administrator').ref('admins/administrator').once('value'));
  await assertSucceeds(dbFor('member').ref('admins/member').once('value'));
  await assertSucceeds(dbFor('missing').ref('admins/missing').once('value'));
  for (const uid of [null, 'member', 'administrator']) {
    await assertFails(dbFor(uid).ref('admins').once('value'));
    await assertFails(dbFor(uid).ref('admins/another').once('value'));
  }
});

test('no client can promote themselves, modify roles, or bypass through ancestor writes', async () => {
  for (const uid of [null, 'member', 'administrator']) {
    const db = dbFor(uid);
    await assertFails(db.ref(`admins/${uid ?? 'guest'}`).set(true));
    await assertFails(db.ref('admins/administrator').remove());
    await assertFails(db.ref('schedule').set({ title: 'Replaced', courses: { A: course } }));
    await assertFails(db.ref('schedule/courses').set({ A: course }));
    await assertFails(db.ref('schedule/title').set('Changed'));
    await assertFails(db.ref().update({ 'admins/member': true, 'schedule/courses/A/title': 'Changed' }));
  }
});

test('revoking membership immediately blocks subsequent writes', async () => {
  const db = dbFor('administrator');
  await assertSucceeds(db.ref('schedule/courses/A').update({ title: 'Allowed' }));
  await environment.withSecurityRulesDisabled(async (context) => {
    await context.database().ref('admins/administrator').set(false);
  });
  await assertFails(db.ref('schedule/courses/A').update({ title: 'Denied' }));
});
