import express from 'express'
import {
  getActiveIngredients,
  getActiveIngredientsForRecipe,
  ingredientDataAPI,
  createIngredient,
  updateIngredient,
  deleteIngredients
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()

router.get('/api/inventory/ingredient/active', isAuthenticated, getActiveIngredientsForRecipe)
router.get(
  '/api/inventory/ingredient/all',
  isAuthenticated,
  checkWarehouseAccess,
  getActiveIngredients
)
router.get('/api/inventory/ingredient', isAuthenticated, checkWarehouseAccess, ingredientDataAPI)
router.post(
  '/api/inventory/ingredient/create',
  isAuthenticated,
  checkWarehouseAccess,
  createIngredient
)
router.post(
  '/api/inventory/ingredient/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  updateIngredient
)
router.post(
  '/api/inventory/ingredient/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  deleteIngredients
)

export default router
