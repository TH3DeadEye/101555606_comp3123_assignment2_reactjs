import { Router } from 'express';
import { login, signup } from '../controllers/userController';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiter';

export const userRoutes = Router();

userRoutes.post('/signup', signupLimiter, signup);
userRoutes.post('/login', loginLimiter, login);
