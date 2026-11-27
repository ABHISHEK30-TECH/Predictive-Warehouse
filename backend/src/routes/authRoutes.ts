import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public: nobody has a token before logging in, so these must NOT use authenticate
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected: need a valid token
router.get('/me', authenticate, AuthController.getMe);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;