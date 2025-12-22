import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { updateCCCD } from './controller.js'

const router = express.Router()

router.post('/api/profile/update-cccd', isAuthenticated, updateCCCD)

export default router
