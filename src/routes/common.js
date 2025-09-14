import express from 'express'
import userRoutes from '../modules/user/route.js'
import adminRoutes from '../modules/admin/route.js'
import ingredientRoutes from '../modules/inventory/ingredient/route.js'
import ingredientCategoryRoutes from '../modules/inventory/ingredient-category/route.js'
import ingredientStockRoute from '../modules/inventory/ingredient-stock/route.js'
import organizationRoutes from '../modules/organization/route.js'
import stockEntryRoutes from '../modules/stock-transaction/stock-entry/route.js'
import stockIssueRoutes from '../modules/stock-transaction/stock-issue/route.js'
import stockTransferRoutes from '../modules/stock-transaction/stock-transfer/route.js'
import stockHistoryRoutes from '../modules/stock-transaction/stock-history/route.js'
import supplierRoutes from '../modules/inventory/supplier/route.js'
import warehouseRoutes from '../modules/inventory/warehouse/route.js'
import tableRoutes from '../modules/table/route.js'
import orderRoutes from '../modules/order/route.js'
import menuCategoryRoutes from '../modules/menu/menu-category/route.js'
import menuItemRoutes from '../modules/menu/menu-item/route.js'
import recipeRoutes from '../modules/menu/recipe/route.js'
import inventoryRoutes from './inventory.js'
import menuRoutes from './menu.js'
import staffRoutes from './staff.js'
import reportRoutes from './report.js'
import comboRoutes from '../modules/menu/combo/route.js'
import couponRoutes from '../modules/coupon/route.js'
import scheduleRoutes from '../modules/schedule/route.js'
import attendanceRoute from '../modules/attendance/route.js'
import shiftRoutes from '../modules/shift/route.js'
import payrollRoutes from '../modules/payroll/route.js'
import taxRoutes from '../modules/tax/route.js'
import activityRoutes from '../modules/activity-logs/route.js'
import paymentRoutes from '../modules/payment/route.js'
import uploadRouter from '../modules/upload/route.js'
import pageRoute from '../pages/route.js'

const router = express.Router()

const routes = [
  // Core
  userRoutes,
  adminRoutes,
  organizationRoutes,
  uploadRouter,

  // Inventory
  ingredientRoutes,
  ingredientCategoryRoutes,
  ingredientStockRoute,
  supplierRoutes,
  warehouseRoutes,
  inventoryRoutes,

  // Stock transactions
  stockEntryRoutes,
  stockIssueRoutes,
  stockTransferRoutes,
  stockHistoryRoutes,

  // Menu
  menuRoutes,
  menuCategoryRoutes,
  menuItemRoutes,
  recipeRoutes,
  comboRoutes,
  shiftRoutes,

  // Table & order
  tableRoutes,
  orderRoutes,

  // Staff
  staffRoutes,
  scheduleRoutes,
  attendanceRoute,
  payrollRoutes,

  // Report
  reportRoutes,

  // Coupon
  couponRoutes,

  // Tax
  taxRoutes,

  // Activity
  activityRoutes,

  // Payment Method
  paymentRoutes,
  pageRoute
]

routes.forEach((route) => router.use('/', route))

export default router
