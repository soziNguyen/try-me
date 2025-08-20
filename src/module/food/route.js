import express from 'express';
import * as foodController from './controller.js';
import { foodsPage } 
from '../../controllers/staffPages.js';
import isAuthenticated from "../../helpers/isAuthenticated.js"


const router = express.Router();

// --- GET PAGE ---
router.get('/foods', isAuthenticated, foodsPage);

// --- Quản lý món ăn ---
router.get('/api/foods', isAuthenticated, foodController.getFoods);
router.post('/api/foods/create', isAuthenticated, foodController.createFood);
router.post('/api/foods/update/:id', isAuthenticated, foodController.updateFood);
router.post('/api/foods/deletes', isAuthenticated, foodController.deleteFoods);

export default router;