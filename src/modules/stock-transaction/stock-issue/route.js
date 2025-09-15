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
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/inventory/stock-issues', isAuthenticated, isPermit('Admin', 'Org'), getStockIssues)
router.post(
  '/api/inventory/stock-issue/create',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  createStockIssue
)
router.get(
  '/api/inventory/stock-issue/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getStockIssueById
)
router.post(
  '/api/inventory/stock-issue/update/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateStockIssue
)
router.post(
  '/api/inventory/stock-issue/deletes',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  deleteStockIssues
)
router.post(
  '/api/inventory/stock-issue/lock/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  lockStockIssue
)

export default router
