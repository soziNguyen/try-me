import express from 'express'
import { getInvoiceOptions, updateInvoiceOptions } from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { checkWarehouseAccess } from '../../helpers/warehouseHelper.js'

const router = express.Router()

// Lấy option của tổ chức hiện tại
router.get('/api/invoice/options', isAuthenticated, checkWarehouseAccess, getInvoiceOptions)

// Cập nhật từng field
router.patch(
  '/api/invoice/options',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateInvoiceOptions
)

export default router
