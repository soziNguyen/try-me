import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import {
  getCouponPlans,
  getCouponPlanById,
  createCouponPlan,
  updateCouponPlan,
  deleteCouponPlan,
  applyCouponPlan,
  confirmCouponPlanUsage
} from './controller.js'

const router = express.Router()

router.get('/api/admin/coupons', isAuthenticated, isPermit('Admin'), getCouponPlans)
router.get('/api/admin/coupon/:id', isAuthenticated, isPermit('Admin'), getCouponPlanById)
router.post('/api/admin/coupon/create', isAuthenticated, isPermit('Admin'), createCouponPlan)
router.post('/api/admin/coupon/update/:id', isAuthenticated, isPermit('Admin'), updateCouponPlan)
router.post('/api/admin/coupon/deletes', isAuthenticated, isPermit('Admin'), deleteCouponPlan)
router.post('/api/admin/coupon/apply', isAuthenticated, applyCouponPlan)
router.post('/api/admin/coupon/confirm', isAuthenticated, confirmCouponPlanUsage)
export default router
