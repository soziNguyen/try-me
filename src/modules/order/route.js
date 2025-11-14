import express from 'express'
import * as orderController from './controller.js'
import { ordersPage } from '../../pages/staffPages.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../helpers/warehouseHelper.js'

const router = express.Router()

// --- GET PAGE ---
router.get('/orders', isAuthenticated, checkWarehouseAccess, ordersPage)
router.get('/orders/:id', isAuthenticated, checkWarehouseAccess, ordersPage)

// --- Đặt món và quản lý đơn hàng ---
router.get('/api/orders/get', isAuthenticated, checkWarehouseAccess, orderController.getOrders)
router.get(
  '/api/orders/getTopItems',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.getTopItems
)
router.post('/api/orders', isAuthenticated, checkWarehouseAccess, orderController.createOrder)
router.get('/api/order/:orderId/public', orderController.getOrderByIdPublic)
router.get(
  '/api/orders/:orderId',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.getOrderById
)
router.post(
  '/api/orders/:orderId/items',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.addItemToOrder
)
router.post(
  '/api/orders/:orderId/items/:itemId',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.updateItemQuantity
)
router.delete(
  '/api/orders/:orderId/items/:itemId',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.removeItemFromOrder
)
router.put(
  '/api/orders/:orderId/customer',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.assignCustomerToOrder
)
router.post(
  '/api/orders/:orderId/update-draft',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.updateOrderDraft
)
router.post(
  '/api/orders/:orderId/checkout',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.checkoutOrder
)
router.get(
  '/orders/print/:orderId',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.printInvoice
)
router.post(
  '/api/orders/:orderId/assign-table',
  isAuthenticated,
  checkWarehouseAccess,
  orderController.assignTableToOrder
)

router.post('/api/order/:orderId/add-items', orderController.submitOrderFromCustomer)
export default router
