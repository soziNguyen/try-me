import express from 'express';
import userRouters from './user.js';
import inventoryRoutes from './inventory.js'
import staffRRoutes from './staff.js'
const router = express.Router();
    
router.use('/', userRouters);
router.use('/', inventoryRoutes);
router.use('/', staffRRoutes);

export default router;