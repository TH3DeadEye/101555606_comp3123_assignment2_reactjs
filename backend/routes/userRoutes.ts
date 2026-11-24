import { Router } from 'express';
import { signup } from '../controllers/userController';

export const userRoutes = Router();

userRoutes.post('/signup', signup);
