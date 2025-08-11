import express from 'express';
import * as tableController from '../controllers/tableController.js';
import * as foodController from '../controllers/foodController.js';
import * as orderController from '../controllers/orderController.js';
import { tablePage, schedulePage, billsPage, foodsPage, ordersPage } 
from '../controllers/staffPages.js';
import isAuthenticated from "../helpers/isAuthenticated.js";
// import isAdmin from "../helpers/isAdmin.js"; // Mở khi cần

const router = express.Router();

// --- Quản lý bàn ---
router.get('/tables', isAuthenticated, tablePage);
router.get('/api/tables', isAuthenticated, tableController.getTables);
router.get('/api/tables/:id', isAuthenticated, tableController.getTableById);
router.post('/api/tables/create', isAuthenticated, tableController.createTable);
router.put('/api/tables/update/:id', isAuthenticated, tableController.updateTable);
router.post('/api/tables/delete',    isAuthenticated, tableController.deleteTables);


// --- Quản lý món ăn ---
router.get('/foods', isAuthenticated, foodsPage);
router.get('/api/foods', isAuthenticated, foodController.getFoods);
router.get('/api/foods/:id', isAuthenticated, foodController.getFoodById);
router.post('/api/foods', isAuthenticated, foodController.createFood);
router.put('/api/foods/:id', isAuthenticated, foodController.updateFood);
router.post('/api/foods/delete', isAuthenticated, foodController.deleteFoods);


// --- Đặt món và quản lý đơn hàng ---
router.get('/orders', isAuthenticated, ordersPage);
router.post('/api/orders/create', isAuthenticated, orderController.createOrder);


// --- Thanh toán ---
router.get('/bills', isAuthenticated, billsPage);


// --- Lịch làm việc ---
router.get('/schedule', isAuthenticated, schedulePage);

export default router;