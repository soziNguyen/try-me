import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { getTaxes, getActiveTaxes, createTax, updateTax, deleteTaxes } from './controller.js'

const router = express.Router()

router.get('/api/taxes/active', isAuthenticated, getActiveTaxes)
router.get('/api/taxes', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), getTaxes)
router.post('/api/tax/create', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), createTax)
router.post('/api/tax/update/:id', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), updateTax)
router.post('/api/tax/deletes', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), deleteTaxes)

export default router
