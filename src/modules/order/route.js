import express from 'express'
import * as orderController from './controller.js'
import { ordersPage } from '../../pages/staffPages.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'

const router = express.Router()

// --- GET PAGE ---
router.get('/orders', isAuthenticated, ordersPage)

// --- Đặt món và quản lý đơn hàng ---
router.get('/api/orders/get', isAuthenticated, orderController.getOrders)
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
router.post('/api/orders/:orderId/update-draft', isAuthenticated, orderController.updateOrderDraft)
router.post('/api/orders/:orderId/checkout', isAuthenticated, orderController.checkoutOrder)
router.get('/orders/print/:orderId', isAuthenticated, orderController.printInvoice)
export default router
