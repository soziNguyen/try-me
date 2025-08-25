import express from 'express'
import isAuthenticated from "../../helpers/isAuthenticated.js"
// import { isPermit } from '../helpers/isPermit.js'
import { getAttendances, getAttendanceById } from './controller.js'

const router = express.Router()

router.get('/api/attendances', isAuthenticated, getAttendances)
router.get('/api/attendance/:id', isAuthenticated, getAttendanceById)

export default router