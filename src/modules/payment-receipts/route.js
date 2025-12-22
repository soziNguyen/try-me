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

import { isPermit } from '../../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/api/payment-receipts',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getReceipts
)
router.get(
  '/api/payment-receipts/:id',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getReceiptById
)
router.post(
  '/api/payment-receipts/create',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  createReceipt
)

router.post(
  '/api/payment-receipts/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateReceipt
)

router.post(
  '/api/payment-receipts/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  deleteReceipts
)

export default router
