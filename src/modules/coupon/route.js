import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { getCoupons, createCoupon, updateCoupon, deleteCoupons, applyCoupon } from './controller.js'

const router = express.Router()

router.get('/api/coupons', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), getCoupons)
router.post(
  '/api/coupon/create',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  createCoupon
)
router.post(
  '/api/coupon/update/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateCoupon
)
router.post(
  '/api/coupon/deletes',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  deleteCoupons
)
router.post('/api/coupon/apply', isAuthenticated, applyCoupon)
export default router
