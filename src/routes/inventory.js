import express from 'express'
import * as page from '../controllers/pages.js'
import { getAllIngredients, ingredientDataAPI, createIngredient, updateIngredient, deleteIngredients } from '../controllers/ingredients.js'
import { getIngredientCategories, createInredientCategory, updateIngredientCategory, deleteIngredientCategories } from '../controllers/ingredientCategories.js'
import { getAllSuppliers, getSuppliers, createSupplier, updateSupplier, forceDeleteSuppliers } from '../controllers/supplier.js'
import { getIngredientStockList } from '../controllers/ingredientStock.js'
import { getActiveWarehouses, getWareHouses, createWareHouse, updateWareHouse, forceDeleteWareHouses } from '../controllers/warehouse.js'
import { getAllStockEntries, getStockEntries, getStockEntryById, createStockEntry, updateStockEntryFromForm, deleteStockEntries, lockStockEntry } from '../controllers/stockEntry.js'
import { getStockIssues, createStockIssue, getStockIssueById, updateStockIssue, deleteStockIssues, lockStockIssue } from '../controllers/stockIssue.js'
import { getStockTransfers, getStockTransferById, createStockTransfer, updateStockTransferFromForm, deleteStockTransfers, lockStockTransfer } from '../controllers/stockTransfer.js'
import { getStockHistories } from '../controllers/stockHistory.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

// Inventory Render Page
router.get('/inventory/ingredients',        isAuthenticated, isPermit('Admin', 'Org'), page.ingredientPage)
router.get('/inventory/categories',         isAuthenticated, isPermit('Admin', 'Org'), page.categoryPage)
router.get('/inventory/inventory-stock',    isAuthenticated, isPermit('Admin', 'Org'), page.ingredientStockPage)
router.get('/inventory/suppliers',          isAuthenticated, isPermit('Admin', 'Org'), page.supplierPage)
router.get('/inventory/warehouses',         isAuthenticated, isPermit('Admin', 'Org'), page.warehousePage)
router.get('/inventory/stock-entries',      isAuthenticated, isPermit('Admin', 'Org'), page.importPage)
router.get('/inventory/stock-issues',       isAuthenticated, isPermit('Admin', 'Org'), page.exportPage)
router.get('/inventory/stock-transfers',    isAuthenticated, isPermit('Admin', 'Org'), page.transferPage)
router.get('/inventory/stock-histories',    isAuthenticated, isPermit('Admin', 'Org'), page.historyPage)
router.get('/inventory/stock-entry/:id',    isAuthenticated, isPermit('Admin', 'Org'), page.newStockEntryPage)
router.get('/inventory/stock-issue/:id',    isAuthenticated, isPermit('Admin', 'Org'), page.newStockIssuePage)
router.get('/inventory/stock-transfer/:id', isAuthenticated, isPermit('Admin', 'Org'), page.newStockTransferPage)


// LOGIC
// 1. Ingredient
router.get('/api/inventory/ingredient/all',         isAuthenticated, isPermit('Admin', 'Org'), getAllIngredients)
router.get('/api/inventory/ingredient',             isAuthenticated, isPermit('Admin', 'Org'), ingredientDataAPI)
router.post('/api/inventory/ingredient/create',     isAuthenticated, isPermit('Admin', 'Org'), createIngredient)
router.post('/api/inventory/ingredient/update/:id', isAuthenticated, isPermit('Admin', 'Org'), updateIngredient)
router.post('/api/inventory/ingredient/deletes',    isAuthenticated, isPermit('Admin', 'Org'), deleteIngredients)

// 2. Ingredient Category
router.get('/api/inventory/categories',             isAuthenticated, isPermit('Admin', 'Org'), getIngredientCategories)
router.post('/api/inventory/category/create',       isAuthenticated, isPermit('Admin', 'Org'), createInredientCategory)
router.post('/api/inventory/category/update/:id',   isAuthenticated, isPermit('Admin', 'Org'), updateIngredientCategory)
router.post('/api/inventory/category/deletes',      isAuthenticated, isPermit('Admin', 'Org'), deleteIngredientCategories)

// 3. Supplier
router.get('/api/inventory/supplier/all',           isAuthenticated, isPermit('Admin', 'Org'), getAllSuppliers)
router.get('/api/inventory/suppliers',              isAuthenticated, isPermit('Admin', 'Org'), getSuppliers)
router.post('/api/inventory/supplier/create',       isAuthenticated, isPermit('Admin', 'Org'), createSupplier)
router.post('/api/inventory/supplier/update/:id',   isAuthenticated, isPermit('Admin', 'Org'), updateSupplier)
router.post('/api/inventory/supplier/deletes',      isAuthenticated, isPermit('Admin', 'Org'), forceDeleteSuppliers)


// 4. Warehouse
router.get('/api/inventory/warehouse/all',          isAuthenticated, isPermit('Admin', 'Org'), getActiveWarehouses)
router.get('/api/inventory/warehouses',             isAuthenticated, isPermit('Admin', 'Org'), getWareHouses)
router.post('/api/inventory/warehouse/create',      isAuthenticated, isPermit('Admin', 'Org'), createWareHouse)
router.post('/api/inventory/warehouse/update/:id',  isAuthenticated, isPermit('Admin', 'Org'), updateWareHouse)
router.post('/api/inventory/warehouse/deletes',     isAuthenticated, isPermit('Admin', 'Org'), forceDeleteWareHouses)

// 5. Stock Entry
router.get('/api/inventory/stock-entry/all',            isAuthenticated, isPermit('Admin', 'Org'), getAllStockEntries)
router.get('/api/inventory/stock-entries',              isAuthenticated, isPermit('Admin', 'Org'), getStockEntries)
router.get("/api/inventory/stock-entry/:id",            isAuthenticated, isPermit('Admin', 'Org'), getStockEntryById)
router.post('/api/inventory/stock-entry/create',        isAuthenticated, isPermit('Admin', 'Org'), createStockEntry)
router.post('/api/inventory/stock-entry/update/:id',    isAuthenticated, isPermit('Admin', 'Org'), updateStockEntryFromForm)
router.post('/api/inventory/stock-entry/deletes',       isAuthenticated, isPermit('Admin', 'Org'), deleteStockEntries)
router.post('/api/inventory/stock-entry/lock/:id',      isAuthenticated, isPermit('Admin', 'Org'), lockStockEntry)

// 6. Stock Issue
router.get('/api/inventory/stock-issues',               isAuthenticated, isPermit('Admin', 'Org'), getStockIssues)
router.post('/api/inventory/stock-issue/create',        isAuthenticated, isPermit('Admin', 'Org'), createStockIssue)
router.get("/api/inventory/stock-issue/:id",            isAuthenticated, isPermit('Admin', 'Org'), getStockIssueById)
router.post('/api/inventory/stock-issue/update/:id',    isAuthenticated, isPermit('Admin', 'Org'), updateStockIssue)
router.post('/api/inventory/stock-issue/deletes',       isAuthenticated, isPermit('Admin', 'Org'), deleteStockIssues)
router.post('/api/inventory/stock-issue/lock/:id',      isAuthenticated, isPermit('Admin', 'Org'), lockStockIssue)

// 7. Stock Issue
router.get('/api/inventory/stock-transfers',            isAuthenticated, isPermit('Admin', 'Org'), getStockTransfers)
router.post('/api/inventory/stock-transfer/create',     isAuthenticated, isPermit('Admin', 'Org'), createStockTransfer)
router.get("/api/inventory/stock-transfer/:id",         isAuthenticated, isPermit('Admin', 'Org'), getStockTransferById)
router.post('/api/inventory/stock-transfer/update/:id', isAuthenticated, isPermit('Admin', 'Org'), updateStockTransferFromForm)
router.post('/api/inventory/stock-transfer/deletes',    isAuthenticated, isPermit('Admin', 'Org'), deleteStockTransfers)
router.post('/api/inventory/stock-transfer/lock/:id',   isAuthenticated, isPermit('Admin', 'Org'), lockStockTransfer)

// 8. Ingredient Stock
router.get('/api/inventory/ingredient-stock',   isAuthenticated, isPermit('Admin', 'Org'), getIngredientStockList)

// 9. Stock Historys
router.get('/api/inventory/stock-histories',    isAuthenticated, isPermit('Admin', 'Org'), getStockHistories)

export default router