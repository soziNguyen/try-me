import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { getCustomers } from './controller.js'

const router = express.Router()

router.get('/api/customers', isAuthenticated, isPermit('Admin', 'Org'), getCustomers)

export default router
