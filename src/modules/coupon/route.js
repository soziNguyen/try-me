import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import {
  getActiveCoupons,
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupons,
  applyCoupon,
  confirmCouponUsage
} from './controller.js'

const router = express.Router()

router.get('/api/coupon/active', isAuthenticated, getActiveCoupons)
router.get('/api/coupons', isAuthenticated, isPermit('Admin', 'Org'), getCoupons)
router.get('/api/coupon/:id', isAuthenticated, isPermit('Admin', 'Org'), getCouponById)
router.post('/api/coupon/create', isAuthenticated, isPermit('Admin', 'Org'), createCoupon)
router.post('/api/coupon/update/:id', isAuthenticated, isPermit('Admin', 'Org'), updateCoupon)
router.post('/api/coupon/deletes', isAuthenticated, isPermit('Admin', 'Org'), deleteCoupons)
router.post('/api/coupon/apply', isAuthenticated, applyCoupon)
router.post('/api/coupon/confirm', isAuthenticated, confirmCouponUsage)
export default router
