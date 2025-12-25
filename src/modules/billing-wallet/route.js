import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { getWalletInfo, walletTopup } from './controller.js'

const router = express.Router()

router.get('/api/wallet', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), getWalletInfo)
router.post(
  '/api/wallet/top-up',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  walletTopup
)

export default router
