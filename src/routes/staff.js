import express from 'express';
import * as tableController from '../controllers/tableController.js';
import isAuthenticated from "../helpers/isAuthenticated.js";
// import isAdmin from "../helpers/isAdmin.js"; // Mở khi cần

const router = express.Router();

// Route: Hiển thị danh sách bàn
router.get('/tables', isAuthenticated, tableController.tablePage);
router.post('/api/tables', isAuthenticated, tableController.createTable);
router.get('/api/tables', isAuthenticated, tableController.getTables);
export default router;