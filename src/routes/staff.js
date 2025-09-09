import express from 'express'
import * as page from '../pages/index.js'
import isAuthenticated from '../helpers/isAuthenticated.js'
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/staff/shifts',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.shiftPage
)
router.get(
  '/staff/schedule',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.schedulePage
)
router.get('/my-schedule', isAuthenticated, page.mySchedulePage)
router.get(
  '/staff/attendance',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.attendancePage
)
router.get(
  '/staff/payroll',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.payrollPage
)
router.get(
  '/staff/attendance/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.attendanceDetail
)
router.get(
  '/staff/payroll/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.payrollDetailPage
)
router.get(
  '/activity-logs',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.activityLog
)

export default router
