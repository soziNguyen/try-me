import express from 'express'
import { getPointSetting, editPoint } from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/setting/point', isAuthenticated, getPointSetting)
router.post('/api/setting/point', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), editPoint)

export default router
