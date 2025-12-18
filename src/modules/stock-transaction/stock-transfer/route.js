import express from 'express'
import {
  getStockTransfers,
  getStockTransferById,
  createStockTransfer,
  updateStockTransferFromForm,
  deleteStockTransfers,
  lockStockTransfer
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/api/inventory/stock-transfers',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getStockTransfers
)
router.post(
  '/api/inventory/stock-transfer/create',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  createStockTransfer
)
router.get(
  '/api/inventory/stock-transfer/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getStockTransferById
)
router.post(
  '/api/inventory/stock-transfer/update/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateStockTransferFromForm
)
router.post(
  '/api/inventory/stock-transfer/deletes',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  deleteStockTransfers
)
router.post(
  '/api/inventory/stock-transfer/lock/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  lockStockTransfer
)

export default router
