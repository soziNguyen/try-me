import express from 'express'
import {
  getPaymentExpenses,
  createPaymentExpense,
  getPaymentExpensesById,
  deletePaymentExpenses,
  updatePaymentExpenses
} from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../helpers/warehouseHelper.js'

const router = express.Router()

router.get('/api/payment-expenses', isAuthenticated, checkWarehouseAccess, getPaymentExpenses)
router.get(
  '/api/payment-expenses/:id',
  isAuthenticated,
  checkWarehouseAccess,
  getPaymentExpensesById
)
router.post(
  '/api/payment-expenses/create',
  isAuthenticated,
  checkWarehouseAccess,
  createPaymentExpense
)

router.post(
  '/api/payment-expenses/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  updatePaymentExpenses
)

router.post(
  '/api/payment-expenses/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  deletePaymentExpenses
)

export default router
