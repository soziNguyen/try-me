import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
// import { isPermit } from '../helpers/isPermit.js'
import { getPayrolls, getPayrollDetail, createPayroll } from './controller.js'

const router = express.Router()

router.get('/api/payrolls', isAuthenticated, getPayrolls)
router.get('/api/payroll/:id', isAuthenticated, getPayrollDetail)
router.post('/api/payroll/create', isAuthenticated, createPayroll)

export default router
