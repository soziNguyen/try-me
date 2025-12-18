import express from 'express'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
// import { isPermit } from '../helpers/isPermit.js'
import {
  getActiveRecipes,
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipes
} from './controller.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/menu/recipes/active', isAuthenticated, getActiveRecipes)
router.get('/api/menu/recipes', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), getRecipes)
router.get(
  '/api/menu/recipe/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getRecipeById
)
router.post(
  '/api/menu/recipe/create',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  createRecipe
)
router.post(
  '/api/menu/recipe/update/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateRecipe
)
router.post(
  '/api/menu/recipe/deletes',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  deleteRecipes
)

export default router
