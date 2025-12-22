import express from 'express'
import {
  getActivePlans,
  getAllPlansAdmin,
  getPlanById,
  getPlanByCode,
  createPlan,
  updatePlan,
  hardDeletePlan,
  upgradePlan,
  approvePlanTransaction,
  cancelPlanTransaction
} from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/admin/plan/active', isAuthenticated, getActivePlans)
router.get('/api/admin/plans', isAuthenticated, isPermit('Admin'), getAllPlansAdmin)
router.post('/api/admin/plan/create', isAuthenticated, isPermit('Admin'), createPlan)
router.post(
  '/api/admin/plan/upgrade',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  upgradePlan
)
router.put('/api/admin/plan/update/:id', isAuthenticated, isPermit('Admin'), updatePlan)
router.get(
  '/api/admin/plan/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getPlanById
)
router.get(
  '/api/admin/plan/code/:code',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getPlanByCode
)
router.post('/api/admin/plan/deletes', isAuthenticated, isPermit('Admin'), hardDeletePlan)
router.post('/api/admin/plan/:id/approve', isPermit('Admin', 'SubAdmin'), approvePlanTransaction)
router.post('/api/admin/plan/:id/cancel', cancelPlanTransaction)

export default router
