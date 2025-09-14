import * as page from './index.js'
import express from 'express'
import isAuthenticated from '../helpers/isAuthenticated.js'
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/table/lists',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.tableManagementPage
)
router.get('/tax', isAuthenticated, isPermit('Admin', 'Org'), page.taxPage)
router.get(
  '/payment-methods',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.paymentMethodPage
)
router.get(
  '/revenue',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.revenuePage
)

export default router
