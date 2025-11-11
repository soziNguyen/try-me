import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../helpers/warehouseHelper.js'
import {
  getReceipts,
  createReceipt,
  getReceiptById,
  deleteReceipts,
  updateReceipt
} from './controller.js'

const router = express.Router()

router.get('/api/payment-receipts', isAuthenticated, checkWarehouseAccess, getReceipts)
router.get('/api/payment-receipts/:id', isAuthenticated, checkWarehouseAccess, getReceiptById)
router.post('/api/payment-receipts/create', isAuthenticated, checkWarehouseAccess, createReceipt)

router.post(
  '/api/payment-receipts/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  updateReceipt
)

router.post('/api/payment-receipts/deletes', isAuthenticated, checkWarehouseAccess, deleteReceipts)

export default router
