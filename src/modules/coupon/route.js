import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { getCoupons, createCoupon, updateCoupon, deleteCoupons, applyCoupon } from './controller.js'

const router = express.Router()

router.get('/api/coupons', isAuthenticated, isPermit('Admin', 'Org'), getCoupons)
router.post('/api/coupon/create', isAuthenticated, isPermit('Admin', 'Org'), createCoupon)
router.post('/api/coupon/update/:id', isAuthenticated, isPermit('Admin', 'Org'), updateCoupon)
router.post('/api/coupon/deletes', isAuthenticated, isPermit('Admin', 'Org'), deleteCoupons)
router.post('/api/coupon/apply', isAuthenticated, applyCoupon)
export default router
