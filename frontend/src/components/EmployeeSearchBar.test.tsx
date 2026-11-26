import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeSearchBar, type SearchValues } from './EmployeeSearchBar';

// Holds the values like the page does, so typing really updates the inputs.
function Harness({ onClear = () => undefined, onValues = () => undefined }: { onClear?: () => void; onValues?: (v: SearchValues) => void }) {
  const [values, setValues] = useState<SearchValues>({ department: '', position: '' });
  return (
    <EmployeeSearchBar
      values={values}
      onChange={(next) => {
        setValues(next);
        onValues(next);
      }}
      onClear={() => {
        setValues({ department: '', position: '' });
        onClear();
      }}
    />
  );
}

describe('EmployeeSearchBar', () => {
  it('is a labelled search region with a labelled box for each term', () => {
    render(<Harness />);

    expect(screen.getByRole('search', { name: 'Search employees' })).toBeInTheDocument();
    expect(screen.getByLabelText('Department')).toBeInTheDocument();
    expect(screen.getByLabelText('Position')).toBeInTheDocument();
  });

  it('reports every change, keeping the other box', async () => {
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);

    await user.type(screen.getByLabelText('Department'), 'eng');
    await user.type(screen.getByLabelText('Position'), 'dev');

    expect(onValues).toHaveBeenLastCalledWith({ department: 'eng', position: 'dev' });
  });

  it('enables "Clear search" only when there is something to clear', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeDisabled();

    await user.type(screen.getByLabelText('Position'), 'x');
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeEnabled();

    await user.clear(screen.getByLabelText('Position'));
    await user.type(screen.getByLabelText('Position'), '   '); // spaces are not a search
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeDisabled();
  });

  it('empties both boxes when cleared', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Harness onClear={onClear} />);
    await user.type(screen.getByLabelText('Department'), 'eng');
    await user.type(screen.getByLabelText('Position'), 'dev');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByLabelText('Department')).toHaveValue('');
    expect(screen.getByLabelText('Position')).toHaveValue('');
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not reload the page when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Department'), 'eng{Enter}');

    expect(screen.getByLabelText('Department')).toHaveValue('eng'); // still there: nothing was submitted
  });
});
