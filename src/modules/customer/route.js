import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import {
  getCustomers,
  getCustomerById,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomers
} from './controller.js'

const router = express.Router()

router.post('/api/customer/create', isAuthenticated, createCustomer)
router.post('/api/customer/update/:id', isAuthenticated, updateCustomer)
router.post('/api/customer/deletes', isAuthenticated, deleteCustomers)
router.get('/api/customers', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), getCustomers)
router.get('/api/customers/search', isAuthenticated, searchCustomers)
router.get('/api/customer/:id', isAuthenticated, getCustomerById)
export default router
