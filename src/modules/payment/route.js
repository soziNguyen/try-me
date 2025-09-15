import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
// import { isPermit } from '../helpers/isPermit.js'
import {
  getActivePaymentMethods,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
} from './controller.js'

const router = express.Router()

router.get('/api/payment-method/active', isAuthenticated, getActivePaymentMethods)
router.get('/api/payment-methods', isAuthenticated, getPaymentMethods)
router.post('/api/payment-method/create', isAuthenticated, createPaymentMethod)
router.post('/api/payment-method/update/:id', isAuthenticated, updatePaymentMethod)
router.post('/api/payment-method/deletes', isAuthenticated, deletePaymentMethod)
export default router
