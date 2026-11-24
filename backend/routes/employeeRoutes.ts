import { Router } from 'express';
import { createEmployee, listEmployees } from '../controllers/employeeController';
import { authenticate } from '../middleware/auth';

export const employeeRoutes = Router();

// Every employee route requires a valid JWT.
employeeRoutes.use(authenticate);

employeeRoutes.get('/employees', listEmployees);
employeeRoutes.post('/employees', createEmployee);
