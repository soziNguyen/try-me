import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import {
  getActiveAccounts,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount
} from './controller.js'

const router = express.Router()

router.get('/api/receiving-account/active', isAuthenticated, getActiveAccounts)
router.get(
  '/api/receiving-accounts',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getAccounts
)
router.post(
  '/api/receiving-account/create',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  createAccount
)
router.post(
  '/api/receiving-account/update/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateAccount
)
router.post(
  '/api/receiving-account/deletes',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  deleteAccount
)
export default router
