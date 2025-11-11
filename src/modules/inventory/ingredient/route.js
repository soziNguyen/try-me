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

const router = express.Router()

router.get('/api/inventory/ingredient/active', isAuthenticated, getActiveIngredientsForRecipe)
router.get('/api/inventory/ingredient/all', isAuthenticated, getActiveIngredients)
router.get('/api/inventory/ingredient', isAuthenticated, ingredientDataAPI)
router.post('/api/inventory/ingredient/create', isAuthenticated, createIngredient)
router.post('/api/inventory/ingredient/update/:id', isAuthenticated, updateIngredient)
router.post('/api/inventory/ingredient/deletes', isAuthenticated, deleteIngredients)

export default router
