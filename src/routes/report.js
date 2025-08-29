import express from 'express'
import * as page from '../pages/index.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

router.get('/reports/sales', isAuthenticated, isPermit('Admin', 'Org'), page.saleReportPage)
router.get('/reports/inventory', isAuthenticated, isPermit('Admin', 'Org'), page.inventoryReportPage)
router.get('/reports/performance', isAuthenticated, isPermit('Admin', 'Org'), page.staffReportPage)
router.get('/reports/tax', isAuthenticated, isPermit('Admin', 'Org'), page.taxReportPage)
router.get('/coupon', isAuthenticated, isPermit('Admin', 'Org'), page.couponPage)
router.get('/tax', isAuthenticated, isPermit('Admin', 'Org'), page.taxPage)

export default router