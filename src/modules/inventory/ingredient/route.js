import express from 'express'
import {
  getAllIngredients,
  ingredientDataAPI,
  createIngredient,
  updateIngredient,
  deleteIngredients
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/api/inventory/ingredient/all',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getAllIngredients
)
router.get(
  '/api/inventory/ingredient',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  ingredientDataAPI
)
router.post(
  '/api/inventory/ingredient/create',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  createIngredient
)
router.post(
  '/api/inventory/ingredient/update/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateIngredient
)
router.post(
  '/api/inventory/ingredient/deletes',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  deleteIngredients
)

export default router
