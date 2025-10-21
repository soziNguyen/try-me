import express from 'express'
import {
  getActivePlans,
  getAllPlansAdmin,
  getPlanById,
  createPlan,
  updatePlan,
  hardDeletePlan
} from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/admin/plan/active', isAuthenticated, getActivePlans)
router.get('/api/admin/plans', isAuthenticated, isPermit('Admin'), getAllPlansAdmin)
router.post('/api/admin/plan/create', isAuthenticated, isPermit('Admin'), createPlan)
router.put('/api/admin/plan/update/:id', isAuthenticated, isPermit('Admin'), updatePlan)
router.get('/api/admin/plan/:id', isAuthenticated, isPermit('Admin'), getPlanById)
router.post('/api/admin/plan/deletes', isAuthenticated, isPermit('Admin'), hardDeletePlan)

export default router
