import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import isAdmin from '../../helpers/isAdmin.js'
import { getPlanTransactions } from './controller.js'

const router = express.Router()

router.get('/api/admin/plan-transactions', isAuthenticated, isAdmin, getPlanTransactions)

export default router
