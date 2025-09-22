import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { getCustomers, searchCustomers } from './controller.js'

const router = express.Router()

router.get('/api/customers', isAuthenticated, isPermit('Admin', 'Org'), getCustomers)
router.get('/api/customers/search', isAuthenticated, searchCustomers)
export default router
