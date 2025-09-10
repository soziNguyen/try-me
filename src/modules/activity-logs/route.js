import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { getActivityLogs } from './controller.js'

const router = express.Router()

router.get(
  '/api/activity-logs',
  isPermit('Admin', 'Org'),
  isAuthenticated,
  getActivityLogs
)

export default router
