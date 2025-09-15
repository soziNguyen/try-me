import express from 'express'
import {
  getActiveMenuCategory,
  getMenuCategory,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get(
  '/api/menu/category/active',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  getActiveMenuCategory
)
router.get('/api/menu/category/', isAuthenticated, isPermit('Admin', 'Org'), getMenuCategory)
router.post(
  '/api/menu/category/create',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  createMenuCategory
)
router.post(
  '/api/menu/category/update/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateMenuCategory
)
router.post(
  '/api/menu/category/deletes',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  deleteMenuCategory
)

export default router
