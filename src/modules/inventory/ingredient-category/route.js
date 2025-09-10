import express from 'express'
import {
  getIngredientCategories,
  createInredientCategory,
  updateIngredientCategory,
  deleteIngredientCategories
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/api/inventory/categories',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getIngredientCategories
)
router.post(
  '/api/inventory/category/create',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  createInredientCategory
)
router.post(
  '/api/inventory/category/update/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateIngredientCategory
)
router.post(
  '/api/inventory/category/deletes',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  deleteIngredientCategories
)

export default router
