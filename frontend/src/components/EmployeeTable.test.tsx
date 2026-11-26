import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Employee } from '../api/types';
import { makeEmployee } from '../test/helpers';
import { EmployeeTable, EmployeeTableSkeleton } from './EmployeeTable';

const jane = makeEmployee({ _id: 'e1', first_name: 'Jane', last_name: 'Doe', salary: 85000, position: 'Engineer', department: 'Engineering' });
const bob = makeEmployee({
  _id: 'e2', first_name: 'Bob', last_name: 'Adams', salary: 60000.5, position: 'Accountant', department: 'Finance',
  date_of_joining: '2022-01-15T00:00:00.000Z', profile_picture: '/uploads/bob.png', email: 'bob@example.com',
});
const cara = makeEmployee({ _id: 'e3', first_name: 'Cara', last_name: 'Zane', salary: 120000, position: 'Designer', department: 'Design', date_of_joining: '2020-06-01T00:00:00.000Z' });

const renderTable = (employees: Employee[], props: Partial<React.ComponentProps<typeof EmployeeTable>> = {}) =>
  render(
    <MemoryRouter>
      <EmployeeTable employees={employees} onDelete={() => undefined} {...props} />
    </MemoryRouter>,
  );

// The names in the order the rows appear on screen (the first paragraph of each row header)
const namesOnScreen = () =>
  screen
    .getAllByRole('row')
    .slice(1) // skip the header row
    .map((row) => within(row).getByRole('rowheader').querySelector('p')?.textContent ?? '');

describe('EmployeeTable: what a row shows', () => {
  it('shows name, email, position, department, a readable date and a formatted salary', () => {
    renderTable([bob]);
    const row = screen.getByRole('row', { name: /Bob Adams/ });

    expect(within(row).getByText('Bob Adams')).toBeInTheDocument();
    expect(within(row).getByText('bob@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Accountant')).toBeInTheDocument();
    expect(within(row).getByText('Finance')).toBeInTheDocument();
    expect(within(row).getByText('Jan 15, 2022')).toBeInTheDocument();
    expect(within(row).getByText('$60,000.50')).toBeInTheDocument();
  });

  it('shows the picture thumbnail, or a placeholder when there is none', () => {
    renderTable([bob, jane]);

    expect(within(screen.getByRole('row', { name: /Bob Adams/ })).getByRole('img')).toHaveAttribute('src', expect.stringMatching(/\/uploads\/bob\.png$/));
    expect(within(screen.getByRole('row', { name: /Jane Doe/ })).queryByRole('img')).not.toBeInTheDocument();
  });

  it('has View, Edit and Delete actions named after the employee', () => {
    renderTable([jane]);

    expect(screen.getByRole('link', { name: 'View Jane Doe' })).toHaveAttribute('href', '/employees/e1');
    expect(screen.getByRole('link', { name: 'Edit Jane Doe' })).toHaveAttribute('href', '/employees/e1/edit');
    expect(screen.getByRole('button', { name: 'Delete Jane Doe' })).toBeInTheDocument();
  });

  it('asks the parent to delete the right employee (the parent shows the confirmation)', async () => {
    const onDelete = vi.fn();
    renderTable([jane, bob], { onDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Delete Bob Adams' }));

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(bob);
  });

  it('disables the buttons of an employee that is being deleted', () => {
    renderTable([jane, bob], { deletingId: 'e1' });

    expect(screen.getByRole('button', { name: 'Delete Jane Doe' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Bob Adams' })).toBeEnabled();
  });
});

describe('EmployeeTable: sorting', () => {
  it('starts in alphabetical order by last name', () => {
    renderTable([jane, cara, bob]);
    expect(namesOnScreen()).toEqual(['Bob Adams', 'Jane Doe', 'Cara Zane']);
  });

  it('sorts by a column header, ascending then descending, and says so to assistive technology', async () => {
    const user = userEvent.setup();
    renderTable([jane, cara, bob]); // positions: Engineer, Designer, Accountant
    const header = screen.getByRole('columnheader', { name: /Position/ });

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(namesOnScreen()).toEqual(['Bob Adams', 'Cara Zane', 'Jane Doe']); // Accountant, Designer, Engineer

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(namesOnScreen()).toEqual(['Jane Doe', 'Cara Zane', 'Bob Adams']);
  });

  it('only one column is the sort column at a time', async () => {
    const user = userEvent.setup();
    renderTable([jane, cara, bob]);

    await user.click(within(screen.getByRole('columnheader', { name: /Department/ })).getByRole('button'));

    expect(screen.getByRole('columnheader', { name: /Department/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: /Employee/ })).not.toHaveAttribute('aria-sort');
  });
});

describe('EmployeeTable: pagination', () => {
  const many = Array.from({ length: 12 }, (_, i) =>
    makeEmployee({ _id: `m${i}`, first_name: `Person${String(i).padStart(2, '0')}`, last_name: 'Smith', email: `p${i}@example.com` }),
  );

  it('shows 10 rows per page and can go to the next page', async () => {
    const user = userEvent.setup();
    renderTable(many);

    expect(namesOnScreen()).toHaveLength(10);
    expect(screen.getByText('1–10 of 12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next page/i }));

    expect(namesOnScreen()).toHaveLength(2);
    expect(screen.getByText('11–12 of 12')).toBeInTheDocument();
  });

  it('has no pagination bar for a short list', () => {
    renderTable([jane, bob]);
    expect(screen.queryByText(/rows per page/i)).not.toBeInTheDocument();
  });

  it('moves back to a valid page when the list becomes shorter', async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable(many);
    await user.click(screen.getByRole('button', { name: /next page/i })); // page 2

    rerender(
      <MemoryRouter>
        <EmployeeTable employees={many.slice(0, 3)} onDelete={() => undefined} />
      </MemoryRouter>,
    );

    expect(namesOnScreen()).toHaveLength(3); // no empty "page 2" of a 3-row list
  });
});

describe('EmployeeTableSkeleton', () => {
  it('announces the loading state and is hidden from the table semantics', () => {
    render(<EmployeeTableSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading employees…');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
