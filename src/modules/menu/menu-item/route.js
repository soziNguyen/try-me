import express from 'express'
import {
  getActiveMenus,
  getMenus,
  createMenu,
  updateMenu,
  deleteMenus,
  searchMenus
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/menu/get/active', isAuthenticated, getActiveMenus)
router.get('/api/menu/get/', isAuthenticated, isPermit('Admin', 'Org'), getMenus)
router.get('/api/menu/search', isAuthenticated, searchMenus)
router.post('/api/menu/create', isAuthenticated, isPermit('Admin', 'Org'), createMenu)
router.post('/api/menu/update/:id', isAuthenticated, isPermit('Admin', 'Org'), updateMenu)
router.post('/api/menu/deletes', isAuthenticated, isPermit('Admin', 'Org'), deleteMenus)

export default router
