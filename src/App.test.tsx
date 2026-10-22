import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const schedule = {
  title: 'Test Schedule',
  courses: {
    A: { term: 'Fall', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha' },
    B: { term: 'Fall', number: '102', meets: 'TuTh 10:00-11:20', title: 'Beta' },
  },
};

const conflictSchedule = {
  title: 'Test Schedule',
  courses: {
    A: { term: 'Fall', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha' },
    B: { term: 'Fall', number: '102', meets: 'TuTh 10:00-11:20', title: 'Beta' },
    C: { term: 'Fall', number: '103', meets: 'M 9:30-10:20', title: 'Gamma' },
  },
};

const mockFetch = (data: typeof schedule = schedule) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => data }) as Response),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Edit course flow', () => {
  it('opens a prefilled edit form from a card Edit link and cancels back to the list', async () => {
    mockFetch();
    const { container } = render(<App />);

    await screen.findByRole('button', { name: /CS 101/ });

    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks).toHaveLength(2);
    fireEvent.click(editLinks[0]);

    await screen.findByRole('heading', { name: 'Edit Fall CS 101' });
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    if (form === null) throw new Error('Expected the edit form to render.');
    expect(
      screen.getByRole('heading', { name: 'Edit Fall CS 101' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Meeting times')).toHaveValue('MWF 9:00-9:50');

    // No submit control on the form.
    expect(
      within(form).queryByRole('button', { name: /submit/i }),
    ).not.toBeInTheDocument();
    expect(form.querySelector('[type="submit"]')).toBeNull();

    // Submitting is intercepted and stays on the edit screen.
    fireEvent.submit(form);
    expect(
      screen.getByRole('heading', { name: 'Edit Fall CS 101' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('button', { name: /CS 101/ });
    expect(
      screen.queryByRole('heading', { name: 'Edit Fall CS 101' }),
    ).not.toBeInTheDocument();
  });

  it('keeps selected courses and conflict prevention after visiting edit and canceling', async () => {
    mockFetch(conflictSchedule);
    render(<App />);

    const selected = await screen.findByRole('button', { name: /CS 101/ });
    fireEvent.click(selected);
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /CS 103/ })).toBeDisabled();

    fireEvent.click(screen.getAllByRole('link', { name: 'Edit' })[0]);
    await screen.findByRole('heading', { name: 'Edit Fall CS 101' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const restored = await screen.findByRole('button', { name: /CS 101/ });
    expect(restored).toHaveAttribute('aria-pressed', 'true');

    const conflicting = screen.getByRole('button', { name: /CS 103/ });
    expect(conflicting).toBeDisabled();
    fireEvent.click(conflicting);
    expect(conflicting).toHaveAttribute('aria-pressed', 'false');
  });
});
