import { describe, expect, it } from 'vitest';
import { makeEmployee } from '../test/helpers';
import { compareEmployees, type EmployeeSortKey } from './sortEmployees';

const sortBy = (key: EmployeeSortKey, employees: ReturnType<typeof makeEmployee>[]) =>
  [...employees].sort((a, b) => compareEmployees(a, b, key)).map((e) => e._id);

describe('compareEmployees', () => {
  it('sorts by last name, then first name, ignoring case', () => {
    const list = [
      makeEmployee({ _id: 'c', first_name: 'Zoe', last_name: 'adams' }),
      makeEmployee({ _id: 'a', first_name: 'Amy', last_name: 'Adams' }),
      makeEmployee({ _id: 'b', first_name: 'Bob', last_name: 'Adams' }),
      makeEmployee({ _id: 'd', first_name: 'Al', last_name: 'Young' }),
    ];
    expect(sortBy('name', list)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sorts position and department alphabetically, with numbers in order', () => {
    const list = [
      makeEmployee({ _id: 'x', position: 'Engineer II', department: 'Floor 10' }),
      makeEmployee({ _id: 'y', position: 'engineer I', department: 'Floor 2' }),
      makeEmployee({ _id: 'z', position: 'Analyst', department: 'Accounts' }),
    ];
    expect(sortBy('position', list)).toEqual(['z', 'y', 'x']);
    expect(sortBy('department', list)).toEqual(['z', 'y', 'x']); // Accounts, Floor 2, Floor 10
  });

  it('sorts salaries as numbers', () => {
    const list = [
      makeEmployee({ _id: 'big', salary: 100000 }),
      makeEmployee({ _id: 'small', salary: 9000 }),
      makeEmployee({ _id: 'mid', salary: 60000.5 }),
    ];
    expect(sortBy('salary', list)).toEqual(['small', 'mid', 'big']);
  });

  it('sorts dates by time', () => {
    const list = [
      makeEmployee({ _id: 'late', date_of_joining: '2024-03-01T00:00:00.000Z' }),
      makeEmployee({ _id: 'early', date_of_joining: '2020-06-01T00:00:00.000Z' }),
      makeEmployee({ _id: 'mid', date_of_joining: '2022-01-15T00:00:00.000Z' }),
    ];
    expect(sortBy('joined', list)).toEqual(['early', 'mid', 'late']);
  });

  it('returns 0 for a tie', () => {
    const a = makeEmployee({ salary: 5 });
    expect(compareEmployees(a, { ...a }, 'salary')).toBe(0);
  });
});
