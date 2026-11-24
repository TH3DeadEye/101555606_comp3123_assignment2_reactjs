import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from '../controllers/employeeController';
import { authenticate } from '../middleware/auth';

export const employeeRoutes = Router();

// Every employee route requires a valid JWT.
employeeRoutes.use(authenticate);

employeeRoutes.get('/employees', listEmployees);
employeeRoutes.post('/employees', createEmployee);
employeeRoutes.delete('/employees', deleteEmployee);
employeeRoutes.get('/employees/:eid', getEmployee);
employeeRoutes.put('/employees/:eid', updateEmployee);
