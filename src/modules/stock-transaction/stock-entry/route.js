import express from 'express'
import {
  getAllStockEntries,
  getStockEntries,
  getStockEntryById,
  createStockEntry,
  updateStockEntryFromForm,
  deleteStockEntries,
  lockStockEntry
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()
router.use(checkWarehouseAccess)

router.get('/api/inventory/stock-entry/all', isAuthenticated, getAllStockEntries)
router.get('/api/inventory/stock-entries', isAuthenticated, getStockEntries)
router.get('/api/inventory/stock-entry/:id', isAuthenticated, getStockEntryById)
router.post('/api/inventory/stock-entry/create', isAuthenticated, createStockEntry)
router.post('/api/inventory/stock-entry/update/:id', isAuthenticated, updateStockEntryFromForm)
router.post('/api/inventory/stock-entry/deletes', isAuthenticated, deleteStockEntries)
router.post('/api/inventory/stock-entry/lock/:id', isAuthenticated, lockStockEntry)

export default router
