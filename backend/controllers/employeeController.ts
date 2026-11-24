import type { Request, Response } from 'express';
import type { QueryFilter } from 'mongoose';
import { logger } from '../config/logger';
import { Employee, type IEmployee } from '../models/Employee';
import { currentUser } from '../utils/currentUser';
import { escapeRegex } from '../utils/escapeRegex';
import { HttpError } from '../utils/HttpError';
import { deleteImage, saveImage } from '../utils/imageStorage';
import { validationError } from '../utils/validationErrors';
import {
  employeeCreateSchema,
  employeeIdParamsSchema,
  employeeIdQuerySchema,
  employeeSearchSchema,
  employeeUpdateSchema,
} from '../validators/employeeSchemas';

// Case-insensitive alphabetical order (Anna, bob, Chris), not ASCII order.
const NAME_ORDER = { locale: 'en', strength: 2 } as const;

// Loads an employee only if it belongs to ownerId.
//
// The owner is part of the database query itself ({ _id, user }), so another
// user's employee is never even loaded. Only when nothing is found do we ask
// a second question, to answer with the right status:
//   403 Forbidden : the employee exists but belongs to someone else
//   404 Not Found : there is no employee with that id
async function findOwnedEmployee(employeeId: string, ownerId: string) {
  const employee = await Employee.findOne({ _id: employeeId, user: ownerId });
  if (employee) return employee;

  const existsForAnotherUser = await Employee.exists({ _id: employeeId });
  if (existsForAnotherUser) {
    throw new HttpError(403, 'You do not have permission to access this employee.', {
      code: 'FORBIDDEN',
      logContext: { employeeId },
    });
  }
  throw new HttpError(404, 'Employee not found.', { code: 'NOT_FOUND', logContext: { employeeId } });
}

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
  // The text fields are validated first, so an invalid request writes nothing to disk.
  const input = employeeCreateSchema.parse(req.body);

  const picture = req.file ? await saveImage(req.file) : null;

  try {
    // The owner always comes from the verified token, never from the request.
    const employee = await Employee.create({ ...input, profile_picture: picture, user: user.id });

    logger.info('Employee created', {
      event: 'employee_created',
      employeeId: employee.id,
      hasPicture: picture !== null,
    });
    res.status(201).json(employee);
  } catch (error) {
    // The employee was not saved, so its picture must not be left behind.
    await deleteImage(picture);
    throw error;
  }
}

// GET /api/v1/emp/employees/:eid -> 200
export async function getEmployee(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const { eid } = employeeIdParamsSchema.parse(req.params);

  const employee = await findOwnedEmployee(eid, user.id);

  res.status(200).json(employee);
}

// PUT /api/v1/emp/employees/:eid -> 200
export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const { eid } = employeeIdParamsSchema.parse(req.params);

  // Ownership is checked first, so a stranger gets 403/404 whatever they send.
  const existing = await findOwnedEmployee(eid, user.id);

  const changes = employeeUpdateSchema.parse(req.body);
  if (Object.keys(changes).length === 0 && !req.file) {
    throw validationError([
      { field: 'body', message: 'Send at least one field or a new picture to update.' },
    ]);
  }

  const newPicture = req.file ? await saveImage(req.file) : null;

  let employee;
  try {
    // The owner is part of the filter again, so the write itself can never
    // touch a document that belongs to someone else.
    employee = await Employee.findOneAndUpdate(
      { _id: eid, user: user.id },
      newPicture ? { ...changes, profile_picture: newPicture } : changes,
      { new: true, runValidators: true },
    );
  } catch (error) {
    await deleteImage(newPicture);
    throw error;
  }

  if (!employee) {
    await deleteImage(newPicture);
    throw new HttpError(404, 'Employee not found.', { code: 'NOT_FOUND', logContext: { employeeId: eid } });
  }

  // The new picture is saved, so the one it replaced is no longer needed.
  if (newPicture) await deleteImage(existing.profile_picture);

  logger.info('Employee updated', {
    event: 'employee_updated',
    employeeId: employee.id,
    fields: Object.keys(changes),
    pictureReplaced: newPicture !== null,
  });
  res.status(200).json(employee);
}

// DELETE /api/v1/emp/employees?eid=xxx -> 204 (no body)
export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const { eid } = employeeIdQuerySchema.parse(req.query);

  // Changing the eid in the URL cannot bypass this: the lookup is owner-scoped.
  const employee = await findOwnedEmployee(eid, user.id);

  await Employee.deleteOne({ _id: employee._id, user: user.id });

  // The record is gone, so its picture file is removed too.
  await deleteImage(employee.profile_picture);

  logger.info('Employee deleted', { event: 'employee_deleted', employeeId: employee.id });
  res.status(204).send();
}

// GET /api/v1/emp/employees/search?department=...&position=... -> 200
// Partial, case-insensitive match. When both are given, both must match. An
// empty array (still 200) means nothing matched.
export async function searchEmployees(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const { department, position } = employeeSearchSchema.parse(req.query);

  // The owner filter is always present, so search can never return another
  // user's employees whatever the search text is.
  const filter: QueryFilter<IEmployee> = { user: user.id };

  // The text is escaped first, so it is matched literally and cannot inject a
  // pattern or a MongoDB operator.
  if (department) filter.department = new RegExp(escapeRegex(department), 'i');
  if (position) filter.position = new RegExp(escapeRegex(position), 'i');

  const employees = await Employee.find(filter)
    .sort({ last_name: 1, first_name: 1 })
    .collation(NAME_ORDER);

  logger.info('Employee search', {
    event: 'employee_search',
    searchedBy: [department && 'department', position && 'position'].filter(Boolean),
    results: employees.length,
  });
  res.status(200).json(employees);
}
