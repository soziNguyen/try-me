import express from 'express'
import isAuthenticated from '../../helpers/isAuthenticated.js'
// import { isPermit } from '../helpers/isPermit.js'
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getMySchedules,
  getSchedulesByRange
} from './controller.js'

const router = express.Router()

router.get('/api/schedules', isAuthenticated, getSchedules)
router.get('/api/schedules/range', isAuthenticated, getSchedulesByRange)
router.get('/api/schedules/my', isAuthenticated, getMySchedules)
router.post('/api/schedule/create', isAuthenticated, createSchedule)
router.post('/api/schedule/update/:id', isAuthenticated, updateSchedule)
router.post('/api/schedule/deletes', isAuthenticated, deleteSchedule)

export default router
