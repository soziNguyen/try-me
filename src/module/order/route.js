import express from 'express';
import * as orderController from './controller.js';
import { ordersPage } 
from '../../controllers/staffPages.js';
import isAuthenticated from "../../helpers/isAuthenticated.js"

const router = express.Router();

// --- GET PAGE ---
router.get('/orders', isAuthenticated, ordersPage);

// --- Đặt món và quản lý đơn hàng ---
router.post('/api/orders', isAuthenticated, orderController.createOrder);

export default router;