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
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/api/inventory/stock-entry/all',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getAllStockEntries
)
router.get(
  '/api/inventory/stock-entries',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getStockEntries
)
router.get(
  '/api/inventory/stock-entry/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getStockEntryById
)
router.post(
  '/api/inventory/stock-entry/create',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  createStockEntry
)
router.post(
  '/api/inventory/stock-entry/update/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateStockEntryFromForm
)
router.post(
  '/api/inventory/stock-entry/deletes',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  deleteStockEntries
)
router.post(
  '/api/inventory/stock-entry/lock/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  lockStockEntry
)

export default router
