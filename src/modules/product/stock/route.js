import express from 'express'
import { getProductStockLists } from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()

router.get('/api/product/stocks', isAuthenticated, checkWarehouseAccess, getProductStockLists)

export default router
