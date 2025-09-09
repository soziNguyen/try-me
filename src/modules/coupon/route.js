import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
// import { isPermit } from '../helpers/isPermit.js'
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
router.get('/api/coupons', isAuthenticated, getCoupons)
router.get('/api/coupon/:id', isAuthenticated, getCouponById)
router.post('/api/coupon/create', isAuthenticated, createCoupon)
router.post('/api/coupon/update/:id', isAuthenticated, updateCoupon)
router.post('/api/coupon/deletes', isAuthenticated, deleteCoupons)
router.post('/api/coupon/apply', isAuthenticated, applyCoupon)
router.post('/api/coupon/confirm', isAuthenticated, confirmCouponUsage)
export default router
