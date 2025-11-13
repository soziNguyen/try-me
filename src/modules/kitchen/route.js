import express from 'express'
import * as kitchenController from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { isPermit } from '../../helpers/isPermit.js'
import { checkWarehouseAccess } from '../../helpers/warehouseHelper.js'

const router = express.Router()

router.get(
  '/api/kitchen/orders',
  isAuthenticated,
  isPermit('Admin', 'Org', 'Kitchen'),
  checkWarehouseAccess,
  kitchenController.getKitchenOrders
)
router.get(
  '/api/kitchen/order/:orderId',
  isAuthenticated,
  isPermit('Admin', 'Org', 'Kitchen'),
  checkWarehouseAccess,
  kitchenController.getKitchenOrderDetail
)
router.post(
  '/api/kitchen/order/:orderId',
  isAuthenticated,
  isPermit('Admin', 'Org', 'Kitchen'),
  checkWarehouseAccess,
  kitchenController.updateKitchenItemStatus
)
export default router
