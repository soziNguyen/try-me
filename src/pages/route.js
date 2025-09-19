import * as page from './index.js'
import express from 'express'
import isAuthenticated from '../helpers/isAuthenticated.js'
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

router.get('/table/lists', isAuthenticated, isPermit('Admin', 'Org'), page.tableManagementPage)
router.get('/tax', isAuthenticated, isPermit('Admin', 'Org'), page.taxPage)
router.get('/payment-methods', isAuthenticated, isPermit('Admin', 'Org'), page.paymentMethodPage)
router.get('/revenue', isAuthenticated, isPermit('Admin', 'Org'), page.revenuePage)
router.get(
  '/receiving-accounts',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.receivingAccountPage
)
router.get('/customers', isAuthenticated, isPermit('Admin', 'Org'), page.customerPage)
router.get('/change-password', isAuthenticated, page.changePasswordPage)
router.get('/profile', isAuthenticated, page.profilePage)
router.get('/receipts', isAuthenticated, page.receiptPage)
router.get('/receipt/:id', isAuthenticated, page.receiptDetailPage)
router.get('/invoice', isAuthenticated, page.invoicePage)

export default router
