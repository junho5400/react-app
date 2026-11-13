import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoursePlanModal } from './CoursePlanModal';
import type { SelectedCourseEntry } from './WeeklyTimetable';

const entry = (id: string, meets: string, term = 'Fall'): SelectedCourseEntry => ({
  id, course: { number: id, title: `Course ${id}`, term, meets },
});
const courses = [
  entry('101', 'MWF 9:00-9:50'),
  entry('202', 'TuTh 14:00-15:20'),
  entry('303', 'M 11:00-12:00', 'Winter'),
  entry('404', 'F 16:00-17:00', 'Spring'),
];
const weekly = () => fireEvent.click(screen.getByRole('button', { name: 'Weekly View' }));

describe('CoursePlanModal', () => {
  it('defaults to the complete list and preserves it across view and term changes', () => {
    render(<CoursePlanModal selectedCourses={courses} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByLabelText('Timetable term')).not.toBeInTheDocument();
    weekly();
    expect(screen.getByRole('button', { name: 'Weekly View' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Timetable term'), { target: { value: 'Winter' } });
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Fall CS 101: Course 101')).toBeInTheDocument();
    weekly();
    expect(screen.getByLabelText('Timetable term')).toHaveValue('Winter');
  });

  it('renders Monday through Friday and repeats courses on each meeting day', () => {
    render(<CoursePlanModal selectedCourses={courses} onClose={vi.fn()} />);
    weekly();
    const timetable = screen.getByRole('region', { name: 'Fall weekly timetable' });
    expect(timetable).toHaveClass('overflow-x-auto');
    expect(timetable).toHaveAttribute('tabindex', '0');
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      expect(within(timetable).getByText(day)).toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: day })).getAllByRole('article')).toHaveLength(1);
    }
    expect(screen.getAllByRole('article', { name: /CS 101:/ })).toHaveLength(3);
    expect(screen.getAllByRole('article', { name: /CS 202:/ })).toHaveLength(2);
    expect(screen.getAllByText('14:00–15:20')).toHaveLength(2);
    expect(screen.queryByRole('article', { name: /CS 303:/ })).not.toBeInTheDocument();
  });

  it('positions blocks by start and end minutes and expands for early and late classes', () => {
    render(<CoursePlanModal selectedCourses={[
      entry('early', 'M 6:30-7:00'), entry('late', 'M 22:00-23:30'),
    ]} onClose={vi.fn()} />);
    weekly();
    const early = screen.getByRole('article', { name: /CS early:/ });
    const late = screen.getByRole('article', { name: /CS late:/ });
    expect(early).toHaveStyle({ top: '45px', height: '45px' });
    expect(late).toHaveStyle({ top: '1440px', height: '135px' });
    expect(screen.getByText('6:00')).toBeInTheDocument();
    expect(screen.getByText('24:00')).toBeInTheDocument();
  });

  it.each([['Winter', '303'], ['Spring', '404']])('filters selected courses to %s', (term, number) => {
    render(<CoursePlanModal selectedCourses={courses} onClose={vi.fn()} />);
    weekly();
    fireEvent.change(screen.getByLabelText('Timetable term'), { target: { value: term } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: new RegExp(`CS ${number}:`) })).toBeInTheDocument();
  });

  it('preserves the list empty state and shows a term-specific weekly empty state', () => {
    render(<CoursePlanModal selectedCourses={[]} onClose={vi.fn()} />);
    expect(screen.getByText('No courses have been selected yet.')).toBeInTheDocument();
    weekly();
    expect(screen.getByText('No courses selected for Fall.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Timetable term'), { target: { value: 'Spring' } });
    expect(screen.getByText('No courses selected for Spring.')).toBeInTheDocument();
  });

  it('shows an empty state when selections belong only to another term', () => {
    render(<CoursePlanModal selectedCourses={[courses[2]]} onClose={vi.fn()} />);
    weekly();
    expect(screen.getByText('No courses selected for Fall.')).toBeInTheDocument();
  });

  it('reports empty, unparseable, and weekend-only meetings without placing invented blocks', () => {
    render(<CoursePlanModal selectedCourses={[
      entry('101', ''), entry('202', 'TBA'), entry('303', 'Sa 9:00-10:00'),
    ]} onClose={vi.fn()} />);
    weekly();
    expect(screen.getByText('Selected Fall courses have no scheduled Monday–Friday meetings.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/No meeting time provided/)).toBeInTheDocument();
  });

  it('keeps unscheduled courses visible beside scheduled courses and updates from props', () => {
    const { rerender } = render(<CoursePlanModal selectedCourses={[courses[0], entry('999', '')]} onClose={vi.fn()} />);
    weekly();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByText(/CS 999: Course 999/)).toBeInTheDocument();
    rerender(<CoursePlanModal selectedCourses={[]} onClose={vi.fn()} />);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText('No courses selected for Fall.')).toBeInTheDocument();
  });

  it('preserves close button and overlay behavior in both views', () => {
    const onClose = vi.fn();
    render(<CoursePlanModal selectedCourses={courses} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    weekly();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByTestId('course-plan-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
