import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// A protected route that only authenticated users can access
router.get('/profile', protect, (req, res) => {
    res.json({ message: 'Welcome to your profile', user: req.user });
});

export default router;
