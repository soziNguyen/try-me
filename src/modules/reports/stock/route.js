import express from 'express'
import { getStockReport } from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/api/reports/stock/ingredients',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getStockReport
)

export default router
