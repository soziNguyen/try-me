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
import { checkWarehouseAccess } from '../../../helpers/warehouseAccess.js'

const router = express.Router()

router.get(
  '/api/inventory/stock-entry/all',
  isAuthenticated,
  checkWarehouseAccess,
  getAllStockEntries
)
router.get('/api/inventory/stock-entries', isAuthenticated, checkWarehouseAccess, getStockEntries)
router.get(
  '/api/inventory/stock-entry/:id',
  isAuthenticated,
  checkWarehouseAccess,
  getStockEntryById
)
router.post(
  '/api/inventory/stock-entry/create',
  isAuthenticated,
  checkWarehouseAccess,
  createStockEntry
)
router.post(
  '/api/inventory/stock-entry/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  updateStockEntryFromForm
)
router.post(
  '/api/inventory/stock-entry/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  deleteStockEntries
)
router.post(
  '/api/inventory/stock-entry/lock/:id',
  isAuthenticated,
  checkWarehouseAccess,
  lockStockEntry
)

export default router
