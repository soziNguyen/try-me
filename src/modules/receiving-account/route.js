import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
// import { isPermit } from '../helpers/isPermit.js'
import {
  getActiveAccounts,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount
} from './controller.js'

const router = express.Router()

router.get('/api/receiving-account/active', isAuthenticated, getActiveAccounts)
router.get('/api/receiving-accounts', isAuthenticated, getAccounts)
router.post('/api/receiving-account/create', isAuthenticated, createAccount)
router.post('/api/receiving-account/update/:id', isAuthenticated, updateAccount)
router.post('/api/receiving-account/deletes', isAuthenticated, deleteAccount)
export default router
