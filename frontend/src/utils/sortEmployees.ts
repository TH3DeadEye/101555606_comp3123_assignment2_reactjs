import type { Employee } from '../api/types';

export type EmployeeSortKey = 'name' | 'position' | 'department' | 'joined' | 'salary';

// Case-insensitive, accent-tolerant, and "Room 2" sorts before "Room 10".
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

// Returns a negative number when a comes first, positive when b does, 0 for a tie.
export function compareEmployees(a: Employee, b: Employee, key: EmployeeSortKey): number {
  switch (key) {
    case 'name':
      return collator.compare(`${a.last_name} ${a.first_name}`, `${b.last_name} ${b.first_name}`);
    case 'position':
      return collator.compare(a.position, b.position);
    case 'department':
      return collator.compare(a.department, b.department);
    case 'joined':
      // by time, not by text
      return Date.parse(a.date_of_joining) - Date.parse(b.date_of_joining);
    case 'salary':
      // by number, not by text ("9000" must come before "100000")
      return a.salary - b.salary;
  }
}
