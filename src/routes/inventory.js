import express from 'express'
import * as page from '../controllers/pages.js'
import { getAllIngredients, ingredientDataAPI, createIngredient, updateIngredient, deleteIngredients } from '../controllers/ingredients.js'
import { getIngredientCategories, createInredientCategory, updateIngredientCategory, deleteIngredientCategories } from '../controllers/ingredientCategories.js'
import { getAllSuppliers, getSuppliers, createSupplier, updateSupplier, deleteSuppliers, forceDeleteSuppliers } from '../controllers/supplier.js'
import { getIngredientStockList } from '../controllers/ingredientStock.js'
import { getActiveWarehouses, getWareHouses, createWareHouse, updateWareHouse, deleteWarehouses, forceDeleteWareHouses } from '../controllers/warehouse.js'
import { getAllStockEntries, getStockEntries, getStockEntryById, createStockEntry, updateStockEntryFromForm, deleteStockEntries, lockStockEntry } from '../controllers/stockEntry.js'
import { getStockIssues, createStockIssue, getStockIssueById, updateStockIssue, deleteStockIssues, lockStockIssue } from '../controllers/stockIssue.js'
import { getStockTransfers, getStockTransferById, createStockTransfer, updateStockTransferFromForm, deleteStockTransfers, lockStockTransfer } from '../controllers/stockTransfer.js'
import { getStockHistories } from '../controllers/stockHistory.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import isAdmin from '../helpers/isAdmin.js'

const router = express.Router()

// Inventory Render Page
router.get('/inventory/ingredients', isAuthenticated, isAdmin, page.ingredientPage)
router.get('/inventory/categories', isAuthenticated, isAdmin, page.categoryPage)
router.get('/inventory/inventory-stock', isAuthenticated, isAdmin, page.ingredientStockPage)
router.get('/inventory/suppliers', isAuthenticated, isAdmin, page.supplierPage)
router.get('/inventory/warehouses', isAuthenticated, isAdmin, page.warehousePage)
router.get('/inventory/stock-entries', isAuthenticated, isAdmin, page.importPage)
router.get('/inventory/stock-issues', isAuthenticated, isAdmin, page.exportPage)
router.get('/inventory/stock-transfers', isAuthenticated, isAdmin, page.transferPage)
router.get('/inventory/stock-histories', isAuthenticated, isAdmin, page.historyPage)
router.get('/inventory/stock-entry/:id', isAuthenticated, isAdmin, page.newStockEntryPage)
router.get('/inventory/stock-issue/:id', isAuthenticated, isAdmin, page.newStockIssuePage)
router.get('/inventory/stock-transfer/:id', isAuthenticated, isAdmin, page.newStockTransferPage)


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
router.post('/api/inventory/supplier/deletes', isAuthenticated, isAdmin, forceDeleteSuppliers)


// 4. Warehouse
router.get('/api/inventory/warehouse/all', isAuthenticated, isAdmin, getActiveWarehouses)
router.get('/api/inventory/warehouses', isAuthenticated, isAdmin, getWareHouses)
router.post('/api/inventory/warehouse/create', isAuthenticated, isAdmin, createWareHouse)
router.post('/api/inventory/warehouse/update/:id', isAuthenticated, isAdmin, updateWareHouse)
router.post('/api/inventory/warehouse/deletes', isAuthenticated, isAdmin, forceDeleteWareHouses)

// 5. Stock Entry
router.get('/api/inventory/stock-entry/all', isAuthenticated, isAdmin, getAllStockEntries)
router.get('/api/inventory/stock-entries', isAuthenticated, isAdmin, getStockEntries)
router.get("/api/inventory/stock-entry/:id", isAuthenticated, isAdmin, getStockEntryById)
router.post('/api/inventory/stock-entry/create', isAuthenticated, isAdmin, createStockEntry)
router.post('/api/inventory/stock-entry/update/:id', isAuthenticated, isAdmin, updateStockEntryFromForm)
router.post('/api/inventory/stock-entry/deletes', isAuthenticated, isAdmin, deleteStockEntries)
router.post('/api/inventory/stock-entry/lock/:id', isAuthenticated, isAdmin, lockStockEntry)

// 6. Stock Issue
router.get('/api/inventory/stock-issues', isAuthenticated, isAdmin, getStockIssues)
router.post('/api/inventory/stock-issue/create', isAuthenticated, isAdmin, createStockIssue)
router.get("/api/inventory/stock-issue/:id", isAuthenticated, isAdmin, getStockIssueById)
router.post('/api/inventory/stock-issue/update/:id', isAuthenticated, isAdmin, updateStockIssue)
router.post('/api/inventory/stock-issue/deletes', isAuthenticated, isAdmin, deleteStockIssues)
router.post('/api/inventory/stock-issue/lock/:id', isAuthenticated, isAdmin, lockStockIssue)

// 7. Stock Issue
router.get('/api/inventory/stock-transfers', isAuthenticated, isAdmin, getStockTransfers)
router.post('/api/inventory/stock-transfer/create', isAuthenticated, isAdmin, createStockTransfer)
router.get("/api/inventory/stock-transfer/:id", isAuthenticated, isAdmin, getStockTransferById)
router.post('/api/inventory/stock-transfer/update/:id', isAuthenticated, isAdmin, updateStockTransferFromForm)
router.post('/api/inventory/stock-transfer/deletes', isAuthenticated, isAdmin, deleteStockTransfers)
router.post('/api/inventory/stock-transfer/lock/:id', isAuthenticated, isAdmin, lockStockTransfer)

// 8. Ingredient Stock
router.get('/api/inventory/ingredient-stock', isAuthenticated, isAdmin, getIngredientStockList)

// 9. Stock Historys
router.get('/api/inventory/stock-histories', isAuthenticated, isAdmin, getStockHistories)

export default router