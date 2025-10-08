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

router.get('/api/inventory/stock-issues', isAuthenticated, getStockIssues)
router.post('/api/inventory/stock-issue/create', isAuthenticated, createStockIssue)
router.get('/api/inventory/stock-issue/:id', isAuthenticated, getStockIssueById)
router.post('/api/inventory/stock-issue/update/:id', isAuthenticated, updateStockIssue)
router.post('/api/inventory/stock-issue/deletes', isAuthenticated, deleteStockIssues)
router.post('/api/inventory/stock-issue/lock/:id', isAuthenticated, lockStockIssue)

export default router
