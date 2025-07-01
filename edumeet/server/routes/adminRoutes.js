// routes/adminRoutes.js
import express from 'express';
import {
  registerAdmin,
  loginAdmin
} from '../controllers/adminController.js';

const router = express.Router();

// Auth routes
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);


export default router;