import express from 'express'
import {
  getActiveWarehouses,
  getWareHouses,
  createWareHouse,
  updateWareHouse,
  forceDeleteWareHouses
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/inventory/warehouse/all', isAuthenticated, getActiveWarehouses)
router.get(
  '/api/inventory/warehouses',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getWareHouses
)
router.post(
  '/api/inventory/warehouse/create',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  createWareHouse
)
router.post(
  '/api/inventory/warehouse/update/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateWareHouse
)
router.post(
  '/api/inventory/warehouse/deletes',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  forceDeleteWareHouses
)

export default router
