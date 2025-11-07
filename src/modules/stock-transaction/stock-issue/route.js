import express from 'express'
import {
  getStockIssues,
  createStockIssue,
  getStockIssueById,
  updateStockIssue,
  deleteStockIssues,
  lockStockIssue
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()

router.get('/api/inventory/stock-issues', isAuthenticated, checkWarehouseAccess, getStockIssues)
router.post(
  '/api/inventory/stock-issue/create',
  isAuthenticated,
  checkWarehouseAccess,
  createStockIssue
)
router.get(
  '/api/inventory/stock-issue/:id',
  isAuthenticated,
  checkWarehouseAccess,
  getStockIssueById
)
router.post(
  '/api/inventory/stock-issue/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  updateStockIssue
)
router.post(
  '/api/inventory/stock-issue/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  deleteStockIssues
)
router.post(
  '/api/inventory/stock-issue/lock/:id',
  isAuthenticated,
  checkWarehouseAccess,
  lockStockIssue
)

export default router
