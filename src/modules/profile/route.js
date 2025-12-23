import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { updateCCCD, verifyProfile, kycRequest, kycRequestAgain } from './controller.js'
import { isPermit } from '../../helpers/isPermit.js'

const router = express.Router()

router.post(
  '/api/profile/update-cccd',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateCCCD
)
router.post(
  '/api/profile/:id/verify',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  verifyProfile
)
router.post(
  '/api/profile/kyc-request/retry',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  kycRequestAgain
)
router.post(
  '/api/profile/kyc-request',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  kycRequest
)

export default router
