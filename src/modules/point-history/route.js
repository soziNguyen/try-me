import express from 'express'
import { getCustomerPointHistoryById } from './controller.js'

const router = express.Router()

router.get('/api/customer/:id/points/history', getCustomerPointHistoryById)

export default router
