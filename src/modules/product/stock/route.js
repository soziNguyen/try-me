import express from 'express'
import { getProductStockLists } from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/product/stocks', isAuthenticated, isPermit('Admin', 'Org'), getProductStockLists)

export default router
