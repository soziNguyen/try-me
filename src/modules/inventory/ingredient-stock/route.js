import express from 'express'
import { getIngredientStockList } from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.post(
  '/api/inventory/ingredient-stock',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getIngredientStockList
)

export default router
