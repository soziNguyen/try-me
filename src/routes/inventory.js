import express from 'express'
import { ingredientDataAPI, createIngredient, updateIngredient, deleteIngredients } from '../controllers/ingredients.js'
import { getIngredientCategories, createInredientCategory, updateIngredientCategory, deleteIngredientCategories } from '../controllers/ingredientCategories.js'
import { getSuppliers, createSupplier, updateSupplier, deleteSuppliers } from '../controllers/supplier.js'
import { ingredientPage, categoryPage, supplierPage , warehousePage, importPage, exportPage, movementPage } from '../controllers/pages.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import isAdmin from '../helpers/isAdmin.js'

const router = express.Router()

// Inventory Render Page
router.get('/inventory/ingredients', isAuthenticated, isAdmin, ingredientPage)
router.get('/inventory/categories', isAuthenticated, isAdmin, categoryPage)
router.get('/inventory/suppliers', isAuthenticated, isAdmin, supplierPage)
router.get('/inventory/warehouses', isAuthenticated, isAdmin, warehousePage)
router.get('/inventory/imports', isAuthenticated, isAdmin, importPage)
router.get('/inventory/exports', isAuthenticated, isAdmin, exportPage)
router.get('/inventory/movements', isAuthenticated, isAdmin, movementPage)


// LOGIC
// 1. Ingredient
router.get('/api/inventory/ingredient', isAuthenticated, isAdmin, ingredientDataAPI)
router.post('/api/inventory/ingredient/create', createIngredient)
router.post('/api/inventory/ingredient/update/:id', updateIngredient)
router.post('/api/inventory/ingredient/deletes', deleteIngredients)

// 2. Ingredient Category
router.get('/api/inventory/categories', isAuthenticated, isAdmin, getIngredientCategories)
router.post('/api/inventory/category/create', isAuthenticated, isAdmin, createInredientCategory)
router.post('/api/inventory/category/update/:id', isAuthenticated, isAdmin, updateIngredientCategory)
router.post('/api/inventory/category/deletes', isAuthenticated, isAdmin, deleteIngredientCategories)

// 3. Supplier
router.get('/api/inventory/suppliers', isAuthenticated, isAdmin, getSuppliers)
router.post('/api/inventory/supplier/create', isAuthenticated, isAdmin, createSupplier)
router.post('/api/inventory/supplier/update/:id', isAuthenticated, isAdmin, updateSupplier)
router.post('/api/inventory/supplier/deletes', isAuthenticated, isAdmin, deleteSuppliers)

export default router