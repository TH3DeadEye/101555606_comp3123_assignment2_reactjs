import type { Request, Response } from 'express';
import { logger } from '../config/logger';
import { Employee } from '../models/Employee';
import { currentUser } from '../utils/currentUser';
import { employeeCreateSchema } from '../validators/employeeSchemas';

// Case-insensitive alphabetical order (Anna, bob, Chris), not ASCII order.
const NAME_ORDER = { locale: 'en', strength: 2 } as const;

// GET /api/v1/emp/employees -> 200
// The filter { user } is what guarantees that only the caller's own employees
// are returned.
export async function listEmployees(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);

  const employees = await Employee.find({ user: user.id })
    .sort({ last_name: 1, first_name: 1 })
    .collation(NAME_ORDER);

  res.status(200).json(employees);
}

// POST /api/v1/emp/employees -> 201
export async function createEmployee(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const input = employeeCreateSchema.parse(req.body);

  // The owner always comes from the verified token, never from the request.
  const employee = await Employee.create({ ...input, user: user.id });

  logger.info('Employee created', { event: 'employee_created', employeeId: employee.id });
  res.status(201).json(employee);
}
