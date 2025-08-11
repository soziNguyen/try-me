import express from 'express';
import * as tableController from '../controllers/tableController.js';
import * as orderController from '../controllers/orderController.js';
import { tablePage } from '../controllers/staffPages.js'
import { schedulePage } from '../controllers/staffPages.js'
import { billsPage } from '../controllers/staffPages.js'
import { ordersPage } from '../controllers/staffPages.js'
import isAuthenticated from "../helpers/isAuthenticated.js";
// import isAdmin from "../helpers/isAdmin.js"; // Mở khi cần

const router = express.Router();

// Route: Hiển thị danh sách bàn
router.get('/tables', isAuthenticated, tablePage);
router.get('/api/tables', isAuthenticated, tableController.getTables);
router.get('/api/tables/:id', isAuthenticated, tableController.getTableById);
router.post('/api/tables/create', isAuthenticated, tableController.createTable);
router.put('/api/tables/update/:id', isAuthenticated, tableController.updateTable);
router.post('/api/tables/delete',    isAuthenticated, tableController.deleteTables);


// Đặt món
router.get('/orders', isAuthenticated, ordersPage);
router.get('/api/orders', isAuthenticated, orderController.getOrders);
router.get('/api/orders/:id', isAuthenticated, orderController.getOrderById);
router.post('/api/orders', isAuthenticated, orderController.createOrder);
router.put('/api/orders/:id', isAuthenticated, orderController.updateOrder);
router.post('/api/orders/delete', isAuthenticated, orderController.deleteOrders);
// Thanh Toán
router.get('/bills', isAuthenticated, billsPage);

// Lịch làm việc
router.get('/schedule', isAuthenticated, schedulePage);

export default router;