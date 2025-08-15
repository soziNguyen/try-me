import express from 'express'
import { getStockHistories } from './controller.js'
import isAuthenticated from "../../../helpers/isAuthenticated.js"
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/inventory/stock-histories', isAuthenticated, isPermit('Admin', 'Org'), getStockHistories)

export default router