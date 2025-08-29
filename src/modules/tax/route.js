import express from 'express'
import isAuthenticated from "../../helpers/isAuthenticated.js"
// import { isPermit } from '../helpers/isPermit.js'
import { getTaxes, getActiveTaxes, createTax, updateTax, deleteTaxes } from './controller.js'

const router = express.Router()

router.get('/api/taxes/active', isAuthenticated, getActiveTaxes)
router.get('/api/taxes', isAuthenticated, getTaxes)
router.post('/api/tax/create', isAuthenticated, createTax)
router.post('/api/tax/update/:id', isAuthenticated, updateTax)
router.post('/api/tax/deletes', isAuthenticated, deleteTaxes)

export default router