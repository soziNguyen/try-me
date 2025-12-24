import express from 'express'
import { payosWebhook } from './controller.js'

const router = express.Router()

router.post('/api/payos/webhook', payosWebhook)

export default router
