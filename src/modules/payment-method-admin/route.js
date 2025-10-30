import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import {
  getActivePaymentMethods,
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethods
} from './controller.js'

const router = express.Router()

router.get('/api/admin/payment-method/active', isAuthenticated, getActivePaymentMethods)
router.get('/api/admin/payment-methods', isAuthenticated, getPaymentMethods)
router.get('/api/admin/payment-method/:id', isAuthenticated, getPaymentMethodById)
router.post('/api/admin/payment-method/create', isAuthenticated, createPaymentMethod)
router.post('/api/admin/payment-method/update/:id', isAuthenticated, updatePaymentMethod)
router.post('/api/admin/payment-method/deletes', isAuthenticated, deletePaymentMethods)
export default router
