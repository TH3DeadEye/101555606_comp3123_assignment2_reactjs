import { Router } from 'express';
import {
  createEmployee,
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
employeeRoutes.get('/employees/:eid', getEmployee);
employeeRoutes.put('/employees/:eid', updateEmployee);
