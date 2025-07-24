import express from 'express';
import * as inventoryController from '../controllers/inventory.js';
import isAuthenticated from "../helpers/isAuthenticated.js";
import isAdmin from '../helpers/isAdmin.js';

const router = express.Router();

// Inventory
router.get('/inventory', isAuthenticated, isAdmin, inventoryController.inventoryPage);

export default router;