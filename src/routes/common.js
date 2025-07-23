import express from 'express';
import userRouters from './user.js';

const router = express.Router();
    
router.use('/', userRouters);

export default router;