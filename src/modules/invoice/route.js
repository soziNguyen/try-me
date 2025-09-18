import express from 'express'
import { getInvoiceOptions, updateInvoiceOptions } from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'

const router = express.Router()

router.get('/api/invoice/get', isAuthenticated, getInvoiceOptions)
router.post('/api/invoice/update', isAuthenticated, updateInvoiceOptions)

export default router
