import express from 'express'
import { payosWebhook, payosReturn } from './controller.js'

const router = express.Router()

router.get('/api/payos/return', payosReturn)
router.post('/api/payos/webhook', payosWebhook)

export default router
