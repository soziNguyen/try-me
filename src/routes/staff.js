import express from 'express'
import * as page from '../pages/index.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

router.get('/staff/shifts', isAuthenticated, isPermit('Admin', 'Org'), page.shiftPage)
router.get('/staff/schedule', isAuthenticated, isPermit('Admin', 'Org'), page.schedulePage)
router.get('/staff/attendance', isAuthenticated, isPermit('Admin', 'Org'), page.attendancePage)
router.get('/staff/payroll', isAuthenticated, isPermit('Admin', 'Org'), page.payrollPage)

export default router