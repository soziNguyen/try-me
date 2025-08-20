import express from 'express';
import * as tableController from './controller.js';
import { tablePage } 
from '../../controllers/staffPages.js';
import isAuthenticated from "../../helpers/isAuthenticated.js"

const router = express.Router();

// --- GET PAGE ---
router.get('/tables', isAuthenticated, tablePage);


// --- Quản lý bàn ---
router.get('/api/tables', isAuthenticated, tableController.getTables);
router.get('/api/tables/:id', isAuthenticated, tableController.getTableById);
router.post('/api/tables/create', isAuthenticated, tableController.createTable);
router.post('/api/tables/update/:id', isAuthenticated, tableController.updateTable);
router.post('/api/tables/delete',    isAuthenticated, tableController.deleteTables);

export default router;