import express from 'express'
import isAuthenticated from "../../../helpers/isAuthenticated.js"
// import { isPermit } from '../helpers/isPermit.js'
import { getActiveRecipes, getRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipes } from './controller.js'

const router = express.Router()

router.get('/api/menu/recipes/active',  isAuthenticated, getActiveRecipes)
router.get('/api/menu/recipes',         isAuthenticated, getRecipes)
router.get('/api/menu/recipe/:id',     isAuthenticated, getRecipeById)
router.post('/api/menu/recipe/create',  isAuthenticated, createRecipe)
router.post('/api/menu/recipe/update/:id',  isAuthenticated, updateRecipe)
router.post('/api/menu/recipe/deletes',  isAuthenticated, deleteRecipes)

export default router