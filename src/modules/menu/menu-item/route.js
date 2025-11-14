import express from 'express'
import {
  getActiveMenus,
  getActiveMenusForRecipe,
  getMenus,
  createMenu,
  updateMenu,
  deleteMenus,
  searchMenus
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()

router.get('/api/menus/active', isAuthenticated, checkWarehouseAccess, getActiveMenusForRecipe)
router.get('/api/menu/get/active', checkWarehouseAccess, getActiveMenus)
router.get(
  '/api/menu/get/',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  getMenus
)
router.get('/api/menu/search', checkWarehouseAccess, searchMenus)
router.post(
  '/api/menu/create',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  createMenu
)
router.post(
  '/api/menu/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  updateMenu
)
router.post(
  '/api/menu/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  deleteMenus
)

export default router
