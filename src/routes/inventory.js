import express from 'express';
import { ingredientDataAPI } from '../controllers/ingredients.js';
import { ingredientPage, categoryPage, supplierPage , warehousePage, importPage, exportPage, movementPage } from '../controllers/pages.js';
import isAuthenticated from "../helpers/isAuthenticated.js";
import isAdmin from '../helpers/isAdmin.js';

const router = express.Router();

// Inventory Render Page
router.get('/inventory/ingredients', isAuthenticated, isAdmin, ingredientPage);
router.get('/inventory/categories', isAuthenticated, isAdmin, categoryPage);
router.get('/inventory/suppliers', isAuthenticated, isAdmin, supplierPage);
router.get('/inventory/warehouses', isAuthenticated, isAdmin, warehousePage);
router.get('/inventory/imports', isAuthenticated, isAdmin, importPage);
router.get('/inventory/exports', isAuthenticated, isAdmin, exportPage);
router.get('/inventory/movements', isAuthenticated, isAdmin, movementPage);


// Logic
router.get('/api/inventory/ingredient', isAuthenticated, isAdmin, ingredientDataAPI);
export default router;