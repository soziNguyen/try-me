import express from 'express'
import * as orderController from './controller.js'
import { ordersPage } from '../../pages/staffPages.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../helpers/warehouseHelper.js'

const router = express.Router()
router.use(checkWarehouseAccess)

// --- GET PAGE ---
router.get('/orders', isAuthenticated, ordersPage)

// --- Đặt món và quản lý đơn hàng ---
router.get('/api/orders/get', isAuthenticated, orderController.getOrders)
router.get('/api/orders/getTopItems', isAuthenticated, orderController.getTopItems)
router.post('/api/orders', isAuthenticated, orderController.createOrder)
router.get('/api/orders/:orderId', isAuthenticated, orderController.getOrderById)
router.post('/api/orders/:orderId/items', isAuthenticated, orderController.addItemToOrder)
router.post(
  '/api/orders/:orderId/items/:itemId',
  isAuthenticated,
  orderController.updateItemQuantity
)
router.delete(
  '/api/orders/:orderId/items/:itemId',
  isAuthenticated,
  orderController.removeItemFromOrder
)
router.put('/api/orders/:orderId/customer', orderController.assignCustomerToOrder)
router.post('/api/orders/:orderId/update-draft', isAuthenticated, orderController.updateOrderDraft)
router.post('/api/orders/:orderId/checkout', isAuthenticated, orderController.checkoutOrder)
router.get('/orders/print/:orderId', isAuthenticated, orderController.printInvoice)
router.post(
  '/api/orders/:orderId/assign-table',
  isAuthenticated,
  orderController.assignTableToOrder
)
export default router
