import * as page from './index.js'
import express from 'express'
import isAuthenticated from '../helpers/isAuthenticated.js'
import { isPermit } from '../helpers/isPermit.js'
import isAdmin from '../helpers/isAdmin.js'
import { checkAccountTypeAccess } from '../helpers/permission.js'

const router = express.Router()

router.get(
  '/table/lists',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  checkAccountTypeAccess,
  page.tableManagementPage
)
router.get('/tax', isAuthenticated, isPermit('Admin', 'Org'), page.taxPage)
router.get('/payment-methods', isAuthenticated, isPermit('Admin', 'Org'), page.paymentMethodPage)
router.get('/revenue', isAuthenticated, isPermit('Admin', 'Org'), page.revenuePage)
router.get(
  '/receiving-accounts',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.receivingAccountPage
)
router.get('/customers', isAuthenticated, isPermit('Admin', 'Org'), page.customerPage)
router.get('/change-password', isAuthenticated, page.changePasswordPage)
router.get('/profile', isAuthenticated, page.profilePage)
router.get('/receipts', isAuthenticated, page.receiptPage)
router.get('/receipt/:id', isAuthenticated, page.receiptDetailPage)
router.get('/invoice', isAuthenticated, page.invoicePage)

// Inventory
router.get('/inventory/ingredients', isAuthenticated, page.ingredientPage)
router.get('/inventory/categories', isAuthenticated, isPermit('Admin', 'Org'), page.categoryPage)
router.get(
  '/inventory/inventory-stock',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.ingredientStockPage
)
router.get('/inventory/suppliers', isAuthenticated, isPermit('Admin', 'Org'), page.supplierPage)
router.get('/inventory/warehouses', isAuthenticated, isPermit('Admin', 'Org'), page.warehousePage)
router.get('/inventory/stock-entries', isAuthenticated, page.importPage)
router.get('/inventory/stock-issues', isAuthenticated, page.exportPage)
router.get(
  '/inventory/stock-transfers',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.transferPage
)
router.get(
  '/inventory/stock-histories',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.historyPage
)
router.get('/inventory/stock-entry/:id', isAuthenticated, page.newStockEntryPage)
router.get('/inventory/stock-issue/:id', isAuthenticated, page.newStockIssuePage)
router.get(
  '/inventory/stock-transfer/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.newStockTransferPage
)

// Menu
router.get('/menu/lists', isAuthenticated, isPermit('Admin', 'Org'), page.menuPage)
router.get('/menu/categories', isAuthenticated, isPermit('Admin', 'Org'), page.menuCategoryPage)
router.get('/menu/recipes', isAuthenticated, isPermit('Admin', 'Org'), page.recipePage)
router.get('/menu/combos', isAuthenticated, isPermit('Admin', 'Org'), page.comboPage)
router.get('/menu/prices', isAuthenticated, isPermit('Admin', 'Org'), page.historyPricePage)
router.get('/menu/recipe/:id', isAuthenticated, isPermit('Admin', 'Org'), page.newRecipePage)

// Staff
router.get('/reports/sales', isAuthenticated, isPermit('Admin', 'Org'), page.saleReportPage)
router.get(
  '/reports/inventory',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.inventoryReportPage
)
router.get('/reports/performance', isAuthenticated, isPermit('Admin', 'Org'), page.staffReportPage)
router.get('/reports/tax', isAuthenticated, isPermit('Admin', 'Org'), page.taxReportPage)
router.get('/coupon', isAuthenticated, isPermit('Admin', 'Org'), page.couponPage)

// Staff management
router.get('/staff/shifts', isAuthenticated, isPermit('Admin', 'Org'), page.shiftPage)
router.get('/staff/schedule', isAuthenticated, isPermit('Admin', 'Org'), page.schedulePage)
router.get('/my-schedule', isAuthenticated, page.mySchedulePage)
router.get('/staff/attendance', isAuthenticated, isPermit('Admin', 'Org'), page.attendancePage)
router.get('/staff/payrolls', isAuthenticated, isPermit('Admin', 'Org'), page.payrollPage)
router.get(
  '/staff/attendance/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  page.attendanceDetail
)
router.get('/staff/payroll/:id', isAuthenticated, isPermit('Admin', 'Org'), page.payrollDetailPage)
router.get('/activity-logs', isAuthenticated, isPermit('Admin', 'Org'), page.activityLog)

// Product
router.get('/product/entries', isAuthenticated, page.productEntryPage)
router.get('/product/entry/:id', isAuthenticated, page.newProductEntryPage)
router.get('/product/stocks', isAuthenticated, page.productStockPage)

//payment
router.get('/payment-expenses/:id', isAuthenticated, page.newExpensesPage)
router.get('/payment-receipts-print', isAuthenticated, page.receiptPrint)
router.get('/payment-receipts', isAuthenticated, page.receiptsPage)
router.get('/payment-expenses', isAuthenticated, page.expensesPage)

router.get('/upgrade', isAuthenticated, page.upgradePage)
router.get('/plans', isAuthenticated, isAdmin, page.planPage)
router.get('/checkout/:id', isAuthenticated, page.checkoutPlan)
router.get('/plan/:id', isAuthenticated, page.planInfoPage)
router.get('/coupons', isAuthenticated, isAdmin, page.couponPlanPage)
router.get('/coupon/:id', isAuthenticated, isAdmin, page.couponPlanDetailPage)
router.get('/organization/:id', isAuthenticated, isAdmin, page.orgDetailPage)
router.get('/plan-transactions', isAuthenticated, isAdmin, page.planTransactionPage)
router.get('/checkout/:id/invoice', isAuthenticated, page.planInvoicePage)
router.get('/admin/payment-methods', isAuthenticated, isAdmin, page.paymentMethodForAdminPage)
router.get('/cart', isAuthenticated, page.customerUI)
export default router
