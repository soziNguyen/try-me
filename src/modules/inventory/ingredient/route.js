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
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/inventory/ingredient/active', isAuthenticated, getActiveIngredientsForRecipe)
router.get(
  '/api/inventory/ingredient/all',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  getActiveIngredients
)
router.get(
  '/api/inventory/ingredient',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  ingredientDataAPI
)
router.post(
  '/api/inventory/ingredient/create',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  createIngredient
)
router.post(
  '/api/inventory/ingredient/update/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  updateIngredient
)
router.post(
  '/api/inventory/ingredient/deletes',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  deleteIngredients
)

export default router
