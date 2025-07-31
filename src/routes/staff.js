import express from 'express';
import * as tableController from '../controllers/tableController.js';
import isAuthenticated from "../helpers/isAuthenticated.js";
// import isAdmin from "../helpers/isAdmin.js"; // Mở khi cần

const router = express.Router();

// Route: Hiển thị danh sách bàn
router.get('/tables', isAuthenticated, tableController.tablePage);
router.get('/api/tables', isAuthenticated, tableController.getTables);
router.get('/api/tables/:id', isAuthenticated, tableController.getTableById);
router.post('/api/tables/create', isAuthenticated, tableController.createTable);
router.put('/api/tables/update/:id', isAuthenticated, tableController.updateTable);
router.post('/api/tables/delete',    isAuthenticated, tableController.deleteTables);
export default router;