import express from 'express';
import * as tableController from '../controllers/tableController.js';
import * as foodController from '../controllers/foodController.js';
import * as orderController from '../controllers/orderController.js';
import { tablePage, schedulePage, billsPage, foodsPage, ordersPage } 
from '../controllers/staffPages.js';
import isAuthenticated from "../helpers/isAuthenticated.js";
// import isAdmin from "../helpers/isAdmin.js"; // Mở khi cần

const router = express.Router();

// --- GET PAGE ---
router.get('/tables', isAuthenticated, tablePage);
router.get('/foods', isAuthenticated, foodsPage);
router.get('/orders', isAuthenticated, ordersPage);
router.get('/bills', isAuthenticated, billsPage);
router.get('/schedule', isAuthenticated, schedulePage);

// --- Quản lý bàn ---
router.get('/api/tables', isAuthenticated, tableController.getTables);
router.get('/api/tables/:id', isAuthenticated, tableController.getTableById);
router.post('/api/tables/create', isAuthenticated, tableController.createTable);
router.post('/api/tables/update/:id', isAuthenticated, tableController.updateTable);
router.post('/api/tables/delete',    isAuthenticated, tableController.deleteTables);


// --- Quản lý món ăn ---
router.get('/api/foods', isAuthenticated, foodController.getFoods);
router.post('/api/foods/create', isAuthenticated, foodController.createFood);
router.post('/api/foods/update/:id', isAuthenticated, foodController.updateFood);
router.post('/api/foods/deletes', isAuthenticated, foodController.deleteFoods);


// --- Đặt món và quản lý đơn hàng ---

router.post('/api/orders', isAuthenticated, orderController.createOrder);


// --- Thanh toán ---



// --- Lịch làm việc ---


export default router;