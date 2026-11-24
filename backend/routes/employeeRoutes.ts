import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  searchEmployees,
  updateEmployee,
} from '../controllers/employeeController';
import { authenticate } from '../middleware/auth';
import { profilePictureUpload } from '../middleware/upload';

export const employeeRoutes = Router();

// Every employee route requires a valid JWT.
employeeRoutes.use(authenticate);

employeeRoutes.get('/employees', listEmployees);
employeeRoutes.post('/employees', profilePictureUpload, createEmployee);
employeeRoutes.delete('/employees', deleteEmployee);
// /employees/search must be declared before /employees/:eid, otherwise Express
// would treat the word "search" as an employee id.
employeeRoutes.get('/employees/search', searchEmployees);
employeeRoutes.get('/employees/:eid', getEmployee);
employeeRoutes.put('/employees/:eid', profilePictureUpload, updateEmployee);
