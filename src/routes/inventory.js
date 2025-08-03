import express from 'express'
import { getAllIngredients, ingredientDataAPI, createIngredient, updateIngredient, deleteIngredients } from '../controllers/ingredients.js'
import { getIngredientCategories, createInredientCategory, updateIngredientCategory, deleteIngredientCategories } from '../controllers/ingredientCategories.js'
import { getAllSuppliers, getSuppliers, createSupplier, updateSupplier, deleteSuppliers } from '../controllers/supplier.js'
import { getAllStockEntries, getStockEntries, createStockEntry, updateStockEntry, deleteStockEntries } from '../controllers/stockEntry.js'
import { getActiveWarehouses, getWareHouses, createWareHouse, updateWareHouse, deleteWarehouses } from '../controllers/warehouse.js'
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
router.get('/api/inventory/ingredient/all', isAuthenticated, isAdmin, getAllIngredients)
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
router.get('/api/inventory/supplier/all', isAuthenticated, isAdmin, getAllSuppliers)
router.get('/api/inventory/suppliers', isAuthenticated, isAdmin, getSuppliers)
router.post('/api/inventory/supplier/create', isAuthenticated, isAdmin, createSupplier)
router.post('/api/inventory/supplier/update/:id', isAuthenticated, isAdmin, updateSupplier)
router.post('/api/inventory/supplier/deletes', isAuthenticated, isAdmin, deleteSuppliers)


// 4. Warehouse
router.get('/api/inventory/warehouse/all', isAuthenticated, isAdmin, getActiveWarehouses)
router.get('/api/inventory/warehouses', isAuthenticated, isAdmin, getWareHouses)
router.post('/api/inventory/warehouse/create', isAuthenticated, isAdmin, createWareHouse)
router.post('/api/inventory/warehouse/update/:id', isAuthenticated, isAdmin, updateWareHouse)
router.post('/api/inventory/warehouse/deletes', isAuthenticated, isAdmin, deleteWarehouses)

// 5. Stock Entry
router.get('/api/inventory/stock-entries/all', isAuthenticated, isAdmin, getAllStockEntries)
router.get('/api/inventory/stock-entries', isAuthenticated, isAdmin, getStockEntries)
router.post('/api/inventory/stock-entries/create', isAuthenticated, isAdmin, createStockEntry)
router.post('/api/inventory/stock-entries/update/:id', isAuthenticated, isAdmin, updateStockEntry)
router.post('/api/inventory/stock-entries/deletes', isAuthenticated, isAdmin, deleteStockEntries)
export default router