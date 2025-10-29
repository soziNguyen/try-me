import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import isAdmin from '../../helpers/isAdmin.js'
import {
  getPlanTransactions,
  getPlanTransactionById,
  deletePlanTransactions
} from './controller.js'

const router = express.Router()

router.get('/api/admin/plan-transactions', isAuthenticated, isAdmin, getPlanTransactions)
router.get('/api/admin/plan-transaction/:id', isAuthenticated, getPlanTransactionById)
router.post(
  '/api/admin/plan-transactions/deletes',
  isAuthenticated,
  isAdmin,
  deletePlanTransactions
)

export default router
