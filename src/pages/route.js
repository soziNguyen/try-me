import * as page from './index.js'
import express from 'express'
import isAuthenticated from '../helpers/isAuthenticated.js'
import { isPermit } from '../helpers/isPermit.js'
import isAdmin from '../helpers/isAdmin.js'
import { checkAccountTypeAccess } from '../helpers/permission.js'
import { checkWarehouseAccess } from '../helpers/warehouseHelper.js'

const router = express.Router()

router.get(
  '/table/lists',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  checkAccountTypeAccess,
  page.tableManagementPage
)
router.get('/tax', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.taxPage)
router.get(
  '/payment-methods',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.paymentMethodPage
)
router.get(
  '/receiving-accounts',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.receivingAccountPage
)
router.get('/customers', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.customerPage)
router.get('/change-password', isAuthenticated, page.changePasswordPage)
router.get('/profile', isAuthenticated, page.profilePage)
router.get('/receipts', isAuthenticated, page.receiptPage)
router.get('/receipt/:id', isAuthenticated, checkWarehouseAccess, page.receiptDetailPage)
router.get('/setting/invoice', isAuthenticated, page.invoicePage)
router.get('/setting/point', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.pointPage)

// Inventory
router.get('/inventory/ingredients', isAuthenticated, page.ingredientPage)
router.get(
  '/inventory/categories',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.categoryPage
)
router.get(
  '/inventory/inventory-stock',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.ingredientStockPage
)
router.get(
  '/inventory/suppliers',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.supplierPage
)
router.get(
  '/inventory/warehouses',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.warehousePage
)
router.get('/inventory/stock-entries', isAuthenticated, page.importPage)
router.get('/inventory/stock-issues', isAuthenticated, page.exportPage)
router.get(
  '/inventory/stock-transfers',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.transferPage
)
router.get(
  '/inventory/stock-histories',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.historyPage
)
router.get('/inventory/stock-entry/:id', isAuthenticated, page.newStockEntryPage)
router.get('/inventory/stock-issue/:id', isAuthenticated, page.newStockIssuePage)
router.get(
  '/inventory/stock-transfer/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.newStockTransferPage
)

// Menu
router.get('/menu/lists', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.menuPage)
router.get(
  '/menu/categories',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.menuCategoryPage
)
router.get('/menu/recipes', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.recipePage)
router.get('/menu/combos', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.comboPage)
router.get(
  '/menu/prices',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.historyPricePage
)
router.get(
  '/menu/recipe/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.newRecipePage
)

// Staff
router.get(
  '/reports/sales',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.saleReportPage
)
router.get(
  '/reports/inventory',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.inventoryReportPage
)
router.get(
  '/reports/performance',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.staffReportPage
)
router.get(
  '/reports/tax',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.taxReportPage
)
router.get('/coupon', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.couponPage)
router.get(
  '/reports/product-report',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.ProductReportPage
)

// Staff management
router.get('/staff/shifts', isAuthenticated, isPermit('Admin', 'SubAdmin', 'Org'), page.shiftPage)
router.get(
  '/staff/schedule',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.schedulePage
)
router.get('/my-schedule', isAuthenticated, page.mySchedulePage)
router.get(
  '/staff/attendance',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.attendancePage
)
router.get(
  '/staff/payrolls',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.payrollPage
)
router.get(
  '/staff/attendance/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.attendanceDetail
)
router.get(
  '/staff/payroll/:id',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.payrollDetailPage
)
router.get(
  '/activity-logs',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org'),
  page.activityLog
)

// Product
router.get('/product/entries', isAuthenticated, page.productEntryPage)
router.get('/product/entry/:id', isAuthenticated, page.newProductEntryPage)
router.get('/product/stocks', isAuthenticated, page.productStockPage)

//payment
router.get('/payment-expenses/:id', isAuthenticated, page.newExpensesPage)
router.get('/payment-receipts/:id', isAuthenticated, page.newReceiptsPage)
router.get('/payment-receipts', isAuthenticated, page.receiptsPage)
router.get('/payment-expenses', isAuthenticated, page.expensesPage)

router.get('/upgrade', isAuthenticated, page.upgradePage)
router.get('/plans', isAuthenticated, isAdmin, page.planPage)
router.get('/checkout/:id', isAuthenticated, page.checkoutPlan)
router.get('/plan/:id', isAuthenticated, page.planInfoPage)
router.get('/coupons', isAuthenticated, isPermit('Admin', 'SubAdmin'), page.couponPlanPage)
router.get('/coupon/:id', isAuthenticated, isAdmin, page.couponPlanDetailPage)
router.get('/organization/:id', isAuthenticated, isPermit('Admin', 'SubAdmin'), page.orgDetailPage)
router.get(
  '/plan-transactions',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  page.planTransactionPage
)
router.get('/checkout/:id/invoice', isAuthenticated, page.planInvoicePage)
router.get('/admin/payment-methods', isAuthenticated, isAdmin, page.paymentMethodForAdminPage)
router.get('/employees', isAuthenticated, isAdmin, page.employeePage)
router.get('/cart', page.customerUI)
router.get(
  '/kitchen/orders',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin', 'Org', 'Kitchen'),
  page.kitchenPage
)
export default router
