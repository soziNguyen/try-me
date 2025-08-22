import express from 'express'
import isAuthenticated from "../../helpers/isAuthenticated.js"
// import { isPermit } from '../helpers/isPermit.js'
import { getShiftOptions, getShifts, createShift, updateShift, deleteShift } from './controller.js'

const router = express.Router()

router.get('/api/shifts/get', isAuthenticated, getShiftOptions)
router.get('/api/shifts', isAuthenticated, getShifts)
router.post('/api/shift/create', isAuthenticated, createShift)
router.post('/api/shift/update/:id', isAuthenticated, updateShift)
router.post('/api/shift/deletes', isAuthenticated, deleteShift)

export default router