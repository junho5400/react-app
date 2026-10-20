import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TermPage } from './TermPage';
import type { CourseSchedule } from '../services/courseSchedule';

const schedule: CourseSchedule = {
  title: 'Test Schedule',
  courses: {
    A: { term: 'Fall', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha' },
    B: { term: 'Fall', number: '102', meets: 'W 9:30-10:20', title: 'Beta' },
    C: { term: 'Fall', number: '103', meets: 'TuTh 9:00-9:50', title: 'Gamma' },
    D: { term: 'Spring', number: '101', meets: 'MWF 9:00-9:50', title: 'Alpha Spring' },
  },
};

const card = (number: string) => screen.getByRole('button', { name: new RegExp(`CS ${number}`) });

describe('TermPage time conflicts', () => {
  it('disables conflicting courses but keeps selected ones selectable', () => {
    render(<TermPage schedule={schedule} />);

    fireEvent.click(card('101'));
    expect(card('101')).toHaveAttribute('aria-pressed', 'true');

    expect(card('102')).toBeDisabled();
    expect(card('103')).toBeEnabled();

    // Disabled cards cannot be selected.
    fireEvent.click(card('102'));
    expect(card('102')).toHaveAttribute('aria-pressed', 'false');

    // Unselecting clears the conflict immediately.
    fireEvent.click(card('101'));
    expect(card('101')).toHaveAttribute('aria-pressed', 'false');
    expect(card('102')).toBeEnabled();
  });

  it('does not conflict across terms', () => {
    render(<TermPage schedule={schedule} />);

    fireEvent.click(card('101'));
    fireEvent.click(screen.getByRole('button', { name: 'Spring' }));
    expect(card('101')).toBeEnabled();
  });
});
