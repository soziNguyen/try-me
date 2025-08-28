import express from 'express'
import isAuthenticated from "../../helpers/isAuthenticated.js"
// import { isPermit } from '../helpers/isPermit.js'
import { getActiveCoupons, getCoupons, getCouponById, createCoupon, updateCoupon, deleteCoupons } from './controller.js'

const router = express.Router()

router.get('/api/coupon/active', isAuthenticated, getActiveCoupons)
router.get('/api/coupons', isAuthenticated, getCoupons)
router.get('/api/coupon/:id', isAuthenticated, getCouponById)
router.post('/api/coupon/create', isAuthenticated, createCoupon)
router.post('/api/coupon/update/:id', isAuthenticated, updateCoupon)
router.post('/api/coupon/deletes', isAuthenticated, deleteCoupons)

export default router