import express from 'express';
import userRouters from './user.js';
import inventoryRoutes from './inventory.js'

const router = express.Router();
    
router.use('/', userRouters);
router.use('/', inventoryRoutes);

export default router;