import express from 'express'
import * as page from '../pages/index.js'
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

export default router