import { getPageData } from '../helpers/pageDataHelper.js'
import { getCurrentOrg } from '../helpers/orgHelper.js'
import { getWarehouseForAdmin } from '../helpers/warehouseHelper.js'
import Order from '../modules/order/model.js'
import InvoiceOption from '../modules/invoice/model.js'
import PlanTransaction from '../modules/plan-transaction/model.js'

//=============================================
//================= USER ======================

// User Management Page
export const userPage = async (req, res) => {
  res.render(
    'users/user',
    getPageData(req, 'Quản lý nhân viên', 'User', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ NHÂN VIÊN'
    })
  )
}

// User Log In Page
export const logInPage = async (req, res) => {
  res.render('users/log_in', getPageData(req, 'Log In', { headerClass: 'staff__header' }))
}

// User Sign Up Page
export const signUpPage = async (req, res) => {
  res.render('users/sign_up', getPageData(req, 'Sign Up', { headerClass: 'staff__header' }))
}

// User Forgot Password Page
export const forgotPasswordPage = async (req, res) => {
  res.render(
    'users/forgot_password',
    getPageData(req, 'Forgot Password', { headerClass: 'staff__header' })
  )
}

// User Reset Password Page
export const resetPasswordPage = async (req, res) => {
  res.render(
    'users/reset_password',
    getPageData(req, 'Reset Password', { headerClass: 'staff__header' })
  )
}

export const profilePage = async (req, res) => {
  res.render(
    'settings/profile',
    getPageData(req, 'Thông tin hồ sơ', 'Profile', {
      headerClass:
        req.user.role === 'Admin' || req.user.role === 'Org' ? 'admin__header' : 'staff__header',
      pageTitle: 'THÔNG TIN HỒ SƠ',
      userRole: req.user.role,
      currentOrgId: req.user.organization
    })
  )
}

export const changePasswordPage = async (req, res) => {
  res.render(
    'settings/change_password',
    getPageData(req, 'Thay đổi mật khẩu', 'Change-password', {
      headerClass: 'staff__header',
      pageTitle: 'THAY ĐỔI MẬT KHẨU',
      headerClass:
        req.user.role === 'Admin' || req.user.role === 'Org' ? 'admin__header' : 'staff__header',
      userRole: req.user.role
    })
  )
}

// Render Dashboard By Role (Admin / Staff)
export const dashboard = async (req, res) => {
  if (req.user && req.user.role === 'Org') {
    return res.render(
      'users/org_dashboard',
      getPageData(req, 'Dashboard', 'Dashboard', {
        headerClass: 'admin__header'
      })
    )
  } else if (req.user && req.user.role === 'Admin') {
    const currentOrg = getCurrentOrg(req)

    if (currentOrg) {
      // Admin nhưng đã chọn tổ chức => hiển thị như Org
      return res.render(
        'users/org_dashboard',
        getPageData(req, 'Dashboard', 'Dashboard', {
          headerClass: 'admin__header',
          currentOrg
        })
      )
    }

    // Admin chưa chọn tổ chức => dashboard Admin
    return res.render(
      'admin/dashboard',
      getPageData(req, 'Dashboard', 'Dashboard', {
        headerClass: 'admin__header'
      })
    )
  } else if (req.user && req.user.role === 'Kitchen') {
    return res.redirect('/kitchen/orders')
  } else {
    return res.render(
      'users/staff_dashboard',
      getPageData(req, 'Dashboard', 'Dashboard', {
        headerClass: 'staff__header'
      })
    )
  }
}

// =================================================
// ================== INVENTORY ====================

// Ingredient Management
export const ingredientPage = (req, res) => {
  res.render(
    'inventory/ingredient',
    getPageData(req, 'Quản lý nguyên liệu', 'Ingredient', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ NGUYÊN LIỆU'
    })
  )
}

// Ingredient Category
export const categoryPage = (req, res) => {
  res.render(
    'inventory/ingredient_cat',
    getPageData(req, 'Quản lý danh mục nguyên liệu', 'Category', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ DANH MỤC NGUYÊN LIỆU'
    })
  )
}

// Warehouse
export const warehousePage = (req, res) => {
  res.render(
    'inventory/warehouse',
    getPageData(req, 'Quản lý nhà kho', 'Warehouse', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ NHÀ KHO'
    })
  )
}

// Supplier
export const supplierPage = (req, res) => {
  res.render(
    'inventory/supplier',
    getPageData(req, 'Quản lý nhà cung cấp', 'Supplier', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ NHÀ CUNG CẤP'
    })
  )
}

// Import
export const importPage = (req, res) => {
  res.render(
    'inventory/stock_entry',
    getPageData(req, 'Phiếu nhập kho', 'Import', {
      headerClass: 'admin__header',
      pageTitle: 'PHIẾU NHẬP KHO'
    })
  )
}

// Export
export const exportPage = (req, res) => {
  res.render(
    'inventory/stock_issue',
    getPageData(req, 'Phiếu Xuất Kho', 'Export', {
      headerClass: 'admin__header',
      pageTitle: 'PHIẾU XUẤT KHO'
    })
  )
}

// Stock Transfer
export const transferPage = (req, res) => {
  res.render(
    'inventory/stock_transfer',
    getPageData(req, 'Phiếu Chuyển Kho', 'Transfer', {
      headerClass: 'admin__header',
      pageTitle: 'PHIẾU CHUYỂN KHO'
    })
  )
}

export const ingredientStockPage = (req, res) => {
  res.render(
    'inventory/ingredient_stock',
    getPageData(req, 'Quản lý Tồn Kho', 'IngredientStock', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ TỒN KHO'
    })
  )
}

// Movement
export const historyPage = (req, res) => {
  res.render(
    'inventory/stock_history',
    getPageData(req, 'Lịch Sử Nhập - Xuất - Chuyển Kho', 'History', {
      headerClass: 'admin__header',
      pageTitle: 'LỊCH SỬ NHẬP - XUẤT - CHUYỂN KHO'
    })
  )
}

// New Stock Entry
export const newStockEntryPage = (req, res) => {
  const stockEntryId = req.params.id
  const mode = req.query.mode || ''

  const isNew = mode === 'new' ? 'Nhập Nguyên Liệu Mới' : 'Chi Tiết Nhập Nguyên Liệu'
  res.render(
    'inventory/stock_entry_detail',
    getPageData(req, isNew, 'New Stock Entry', {
      stockEntryId: stockEntryId
    })
  )
}

// New Stock Issue
export const newStockIssuePage = (req, res) => {
  const stockIssueId = req.params.id
  const mode = req.query.mode || ''

  const isNew = mode === 'new' ? 'Tạo Phiếu Xuất Kho' : 'Chi Tiết Xuất Kho'
  res.render(
    'inventory/stock_issue_detail',
    getPageData(req, isNew, 'New Issue Entry', {
      stockIssueId: stockIssueId
    })
  )
}

// New Stock Transfer
export const newStockTransferPage = (req, res) => {
  const stockTransferId = req.params.id
  const mode = req.query.mode || ''

  const isNew = mode === 'new' ? 'Tạo Phiếu Chuyển Kho' : 'Chi Tiết Chuyển Kho'
  res.render(
    'inventory/stock_transfer_detail',
    getPageData(req, isNew, 'New Transfer Entry', {
      stockTransferId: stockTransferId
    })
  )
}

// =================================================
// ================== MENU ========================

export const menuPage = (req, res) => {
  res.render(
    'menu/list',
    getPageData(req, 'Quản lý thực đơn', 'Menu', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ THỰC ĐƠN'
    })
  )
}

export const recipePage = (req, res) => {
  res.render(
    'menu/recipe',
    getPageData(req, 'Quản lý công thức món ăn', 'Recipe', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ CÔNG THỨC MÓN ĂN'
    })
  )
}

export const menuCategoryPage = (req, res) => {
  res.render(
    'menu/categories',
    getPageData(req, 'Quản lý danh mục món ăn', 'MenuCategory', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ DANH MỤC MÓN ĂN'
    })
  )
}

export const comboPage = (req, res) => {
  res.render(
    'menu/combo',
    getPageData(req, 'Quản lý combo', 'Combo', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ COMBO'
    })
  )
}

export const historyPricePage = (req, res) => {
  res.render(
    'menu/history_price',
    getPageData(req, 'Lịch sử thay đổi giá món ăn', 'HistoryPrice', {
      headerClass: 'admin__header',
      pageTitle: 'LỊCH SỬ THAY ĐỔI GIÁ MÓN ĂN'
    })
  )
}

export const newRecipePage = (req, res) => {
  const recipeId = req.params.id
  const mode = req.query.mode || ''

  const isNew = mode === 'new' ? 'Thêm mới công thức' : 'Chi Tiết Công Thức'

  res.render(
    'menu/add_recipe',
    getPageData(req, isNew, 'New Recipe', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ CÔNG THỨC',
      recipeId: recipeId
    })
  )
}

// =================================================
// ================== ADMIN ========================

export const userManagementPage = (req, res) => {
  res.render(
    'admin/users',
    getPageData(req, 'Quản lý người dùng', 'User Management', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ NGƯỜI DÙNG'
    })
  )
}

export const orgManagementPage = (req, res) => {
  res.render(
    'admin/organizations',
    getPageData(req, 'Quản lý Tổ chức', 'Org Management', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ TỔ CHỨC'
    })
  )
}

export const auditPage = (req, res) => {
  res.render(
    'admin/audit_log',
    getPageData(req, 'Nhật ký hoạt động', 'Activity', {
      headerClass: 'admin__header',
      pageTitle: 'NHẬT KÝ HOẠT ĐỘNG'
    })
  )
}

// =================================================
// ================== STAFF ========================

export const shiftPage = async (req, res) => {
  res.render(
    'users/shift',
    getPageData(req, 'Quản lý ca', 'Shift', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ CA'
    })
  )
}

export const schedulePage = async (req, res) => {
  res.render(
    'users/schedule',
    getPageData(req, 'Quản lý lịch làm việc', 'Schedule', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ LỊCH LÀM VIỆC'
    })
  )
}

export const mySchedulePage = async (req, res) => {
  res.render(
    'staff/schedule',
    getPageData(req, 'Lịch làm việc của tôi', 'My Schedule', {
      headerClass: 'staff__header',
      pageTitle: 'LỊCH LÀM VIỆC CỦA TÔI'
    })
  )
}

export const attendancePage = async (req, res) => {
  res.render(
    'users/attendance',
    getPageData(req, 'Quản lý chấm công', 'Attendance', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ CHẤM CÔNG'
    })
  )
}

export const payrollPage = async (req, res) => {
  res.render(
    'users/payroll',
    getPageData(req, 'Quản lý lương', 'Payroll', {
      headerClass: 'admin__header',
      pageTitle: 'BẢNG LƯƠNG'
    })
  )
}

export const attendanceDetail = (req, res) => {
  const { id } = req.params

  res.render(
    'users/attendance-detail',
    getPageData(req, 'Chi tiết chấm công', 'Attendance Detail', {
      headerClass: 'admin__header',
      pageTitle: 'CHI TIẾT CHẤM CÔNG ',
      attendanceId: id
    })
  )
}

export const payrollDetailPage = (req, res) => {
  const { id } = req.params
  res.render(
    'users/payroll-detail',
    getPageData(req, 'Chi tiết lương', 'Payroll Detail', {
      headerClass: 'admin__header',
      pageTitle: 'CHI TIẾT LƯƠNG ',
      payrollId: id
    })
  )
}

// =================================================
// ================== REPORTS ======================

export const saleReportPage = async (req, res) => {
  res.render(
    'reports/sale',
    getPageData(req, 'Báo cáo bán hàng', 'SalesReport', {
      headerClass: 'admin__header',
      pageTitle: 'BÁO CÁO BÁN HÀNG'
    })
  )
}

export const inventoryReportPage = async (req, res) => {
  res.render(
    'reports/inventory',
    getPageData(req, 'Báo cáo kho', 'InventoryReport', {
      headerClass: 'admin__header',
      pageTitle: 'BÁO CÁO KHO'
    })
  )
}

export const staffReportPage = async (req, res) => {
  res.render(
    'reports/staff',
    getPageData(req, 'Quản lý nhân viên', 'StaffReport', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ NHÂN VIÊN'
    })
  )
}

export const taxReportPage = async (req, res) => {
  res.render(
    'reports/tax',
    getPageData(req, 'Báo cáo thuế', 'TaxReport', {
      headerClass: 'admin__header',
      pageTitle: 'BÁO CÁO THUẾ'
    })
  )
}

export const ProductReportPage = async (req, res) => {
  res.render(
    'reports/product-report',
    getPageData(req, 'Báo cáo kho sản phẩm ', 'ProductReport', {
      headerClass: 'admin__header',
      pageTitle: 'BÁO CÁO KHO SẢN PHẨM'
    })
  )
}

export const couponPage = async (req, res) => {
  res.render(
    'coupon/coupon',
    getPageData(req, 'Mã giảm giá', 'Coupon', {
      headerClass: 'admin__header',
      pageTitle: 'MÃ GIẢM GIÁ'
    })
  )
}

export const paymentMethodPage = async (req, res) => {
  res.render(
    'payment/payment_method',
    getPageData(req, 'Quản lý phương thức thanh toán', 'Payment Method', {
      headerClass: 'admin__header',
      pageTitle: 'PHƯƠNG THỨC THANH TOÁN'
    })
  )
}

export const taxPage = async (req, res) => {
  res.render(
    'tax/index',
    getPageData(req, 'Thuế', 'Tax', {
      headerClass: 'admin__header',
      pageTitle: 'THUẾ'
    })
  )
}

export const activityLog = async (req, res) => {
  res.render(
    'users/activity_logs',
    getPageData(req, 'Nhật ký hoạt động', 'ActivityLog', {
      headerClass: 'admin__header',
      pageTitle: 'NHẬT KÝ HOẠT ĐỘNG'
    })
  )
}

export const tableManagementPage = async (req, res) => {
  res.render(
    'admin/table',
    getPageData(req, 'Quản lý bàn', 'Table Management', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ BÀN'
    })
  )
}

export const revenuePage = async (req, res) => {
  res.render(
    'admin/revenue',
    getPageData(req, 'Quản lý doanh thu', 'Revenue', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ DOANH THU'
    })
  )
}

export const receivingAccountPage = async (req, res) => {
  res.render(
    'payment/receiving_account',
    getPageData(req, 'Quản lý tài khoản ngân hàng', 'Receiving', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ NGÂN HÀNG'
    })
  )
}

export const customerPage = async (req, res) => {
  res.render(
    'admin/customer',
    getPageData(req, 'Quản lý khách hàng', 'Customer', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ KHÁCH HÀNG'
    })
  )
}

export const receiptPage = async (req, res) => {
  res.render(
    'staff/receipts',
    getPageData(req, 'Quản lý hóa đơn', 'Receipt', {
      headerClass: 'staff__header',
      pageTitle: 'HÓA ĐƠN'
    })
  )
}

export const receiptDetailPage = async (req, res) => {
  try {
    const { id } = req.params

    const order = await Order.findById(id)
      .populate('items.foodId', 'name price')
      .populate('tableId', 'name')
      .populate('organization', 'logo name phone province commune street')
      .populate({
        path: 'paymentMethodId',
        populate: {
          path: 'receivingAccountId',
          model: 'ReceivingAccount'
        }
      })

    if (!order) return res.status(404).send('Không tìm thấy đơn hàng')

    const orgId = order.organization ? order.organization._id : null
    const warehouseId = await getWarehouseForAdmin(req, orgId, true)

    let invoiceOptions = null
    if (orgId) {
      invoiceOptions = await InvoiceOption.findOne({ organizationId: orgId, warehouseId }).lean()
    }

    const has = (v) => v !== undefined && v !== null && String(v).trim() !== ''

    // Ưu tiên invoiceOptions -> organization -> default
    const logoStore = has(invoiceOptions?.logo) ? invoiceOptions.logo : ''

    const invoiceHeader = has(invoiceOptions?.header) ? invoiceOptions.header : ''

    const invoiceFooter = has(invoiceOptions?.footer)
      ? invoiceOptions.footer
      : `<p class="text-center">Xin cảm ơn, hẹn gặp lại quý khách<br>
         Chúng tôi luôn trân trọng mọi ý kiến đóng góp về chất lượng món ăn và dịch vụ.</p>`

    const invoiceTitle = has(invoiceOptions?.invoiceTitle)
      ? invoiceOptions.invoiceTitle
      : 'HÓA ĐƠN BÁN HÀNG'

    const prefix = has(invoiceOptions?.prefix) ? invoiceOptions.prefix : 'HD'
    const orderDate = order.createdAt ? order.createdAt.toISOString() : ''

    let paymentAccountInfo = null
    if (order.paymentMethodId && order.paymentMethodId.receivingAccountId) {
      const acc = order.paymentMethodId.receivingAccountId
      paymentAccountInfo = {
        accountName: acc.name || '',
        accountNumber: acc.accountNumber || '',
        bankName: acc.bankName || acc.bankCode || ''
      }
    }

    res.render('staff/printbill', {
      title: 'Hóa đơn thanh toán',
      order,
      orderId: order._id,
      currentUserId: req.user ? req.user._id : null,
      user: req.user || { username: 'Admin' },
      invoiceOptions,
      logoStore,
      prefix,
      invoiceTitle,
      invoiceHeader,
      invoiceFooter,
      paymentAccountInfo,
      orderDate
    })
  } catch (error) {
    console.error('Lỗi khi in hóa đơn:', error)
  }
}

export const invoicePage = async (req, res) => {
  res.render(
    'settings/invoice',
    getPageData(req, 'Cài đặt hóa đơn', 'Invoice', {
      headerClass: 'admin__header',
      pageTitle: 'CÀI ĐẶT HÓA ĐƠN',
      userRole: req.user.role,
      currentOrgId: req.user.organization
    })
  )
}

export const pointPage = async (req, res) => {
  res.render(
    'settings/point',
    getPageData(req, 'Quy đổi điểm', 'Loyalty', {
      headerClass: 'admin__header',
      pageTitle: 'QUY ĐỔI ĐIỂM',
      userRole: req.user.role,
      currentOrgId: req.user.organization
    })
  )
}

export const productEntryPage = async (req, res) => {
  res.render(
    'product/entry',
    getPageData(req, 'Quản lý thành phẩm', 'Product Entry', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ THÀNH PHẨM'
    })
  )
}

export const newProductEntryPage = async (req, res) => {
  const productEntryId = req.params.id
  const mode = req.query.mode || ''
  const isNew = mode === 'new' ? 'Nhập Sản Phẩm Mới' : 'Chi Tiết Nhập Sản Phẩm'

  res.render(
    'product/entry-detail',
    getPageData(req, isNew, 'New Product Entry', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ THÀNH PHẨM',
      productEntryId: productEntryId,
      userRole: req.user.role,
      currentOrgId: req.user.organization
    })
  )
}

export const productStockPage = (req, res) => {
  res.render(
    'product/stock',
    getPageData(req, 'Quản lý kho thành phẩm', 'Product Stock', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ KHO THÀNH PHẨM'
    })
  )
}

export const receiptsPage = (req, res) => {
  res.render(
    'revenue-expenditure/payment-receipts',
    getPageData(req, 'Phiếu Thu', 'PaymentReceipts', {
      headerClass: 'admin__header',
      pageTitle: 'Phiếu Thu'
    })
  )
}

export const newReceiptsPage = async (req, res) => {
  const paymentReceiptsId = req.params.id
  const mode = req.query.mode || ''
  const isNew = mode === 'new' ? 'Thêm Phiếu Thu' : 'Thu Tiết Phiếu Thu'

  res.render(
    'revenue-expenditure/payment-receipts-detail',
    getPageData(req, isNew, 'Payment Receipts Detail', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ PHIẾU THU',
      paymentReceiptsId,
      userRole: req.user.role,
      currentOrgId: req.user.organization
    })
  )
}

export const expensesPage = (req, res) => {
  res.render(
    'revenue-expenditure/payment-expenses',
    getPageData(req, 'Phiếu Chi', 'PaymentExpenses', {
      headerClass: 'admin__header',
      pageTitle: 'Phiếu Chi'
    })
  )
}

export const newExpensesPage = async (req, res) => {
  const paymentExpenseId = req.params.id
  const mode = req.query.mode || ''
  const isNew = mode === 'new' ? 'Thêm Phiếu Chi' : 'Chi Tiết Phiếu Chi'

  res.render(
    'revenue-expenditure/payment-expenses-detail',
    getPageData(req, isNew, 'Payment Expense Detail', {
      headerClass: 'admin__header',
      pageTitle: 'QUẢN LÝ PHIẾU CHI',
      paymentExpenseId,
      userRole: req.user.role,
      currentOrgId: req.user.organization
    })
  )
}

export const planPage = (req, res) => {
  res.render(
    'admin/plan',
    getPageData(req, 'Danh sách gói', 'Plan', {
      headerClass: 'admin__header',
      pageTitle: 'DANH SÁCH GÓI DỊCH VỤ'
    })
  )
}

export const upgradePage = (req, res) => {
  res.render(
    'package/package',
    getPageData(req, 'Nâng cấp gói', 'Upgrade', {
      headerClass: 'admin__header',
      pageTitle: 'NÂNG CẤP GÓI'
    })
  )
}

export const checkoutPlan = (req, res) => {
  res.render(
    'package/checkout',
    getPageData(req, 'Thanh toán', 'Checkout', {
      headerClass: 'admin__header',
      pageTitle: 'THANH TOÁN'
    })
  )
}

export const planInfoPage = (req, res) => {
  const planId = req.params.id
  const mode = req.query.mode || ''

  const isNew = mode === 'new' ? 'Tạo gói dịch vụ' : 'Chi tiết gói dịch vụ'
  res.render(
    'admin/plan-detail',
    getPageData(req, isNew, 'Plan Info', {
      planId: planId
    })
  )
}

export const couponPlanPage = async (req, res) => {
  res.render(
    'admin/coupon',
    getPageData(req, 'Mã giảm giá', 'Coupon Plan', {
      headerClass: 'admin__header',
      pageTitle: 'MÃ GIẢM GIÁ'
    })
  )
}

export const couponPlanDetailPage = async (req, res) => {
  const couponId = req.params.id
  res.render(
    'admin/coupon-detail',
    getPageData(req, 'Chi tiết mã giảm giá', 'Coupon Detail', {
      headerClass: 'admin__header',
      pageTitle: 'MÃ GIẢM GIÁ',
      couponId
    })
  )
}

export const orgDetailPage = async (req, res) => {
  const orgId = req.params.id

  res.render(
    'admin/org_detail',
    getPageData(req, 'Chi tiết tổ chức', 'Organization Detail', {
      headerClass: 'admin__header',
      pageTitle: 'CHI TIẾT TỔ CHỨC',
      orgId
    })
  )
}

export const planTransactionPage = async (req, res) => {
  res.render(
    'admin/plan_transaction',
    getPageData(req, 'Lịch sử thanh toán', 'Plan Transaction', {
      headerClass: 'admin__header',
      pageTitle: 'LỊCH SỬ THANH TOÁN'
    })
  )
}

export const planInvoicePage = async (req, res) => {
  try {
    const { id } = req.params
    const transaction = await PlanTransaction.findById(id)
      .populate('organization')
      .populate('plan')
      .populate('paymentMethod', 'name code bankInfo')

    if (!transaction)
      return res.status(404).render('errors/error-404', {
        title: 'Không tìm thấy trang',
        message: 'Không tìm thấy hóa đơn'
      })

    res.render('package/invoice', {
      title: 'Hóa đơn',
      pageTitle: 'HÓA ĐƠN DỊCH VỤ',
      transaction,
      currentUserId: req.user?._id
    })
  } catch (err) {
    res.status(500).render(err.message)
  }
}

export const paymentMethodForAdminPage = async (req, res) => {
  res.render(
    'admin/payment_method',
    getPageData(req, 'Quản lý phương thức thanh toán', 'Payment Method', {
      headerClass: 'admin__header',
      pageTitle: 'PHƯƠNG THỨC THANH TOÁN'
    })
  )
}

export const customerUI = async (req, res) => {
  res.render('customer/index', getPageData(req, 'Đặt hàng'))
}

export const kitchenPage = async (req, res) => {
  res.render(
    'kitchen/index',
    getPageData(req, 'Quản lý chế biến', 'Kitchen', {
      headerClass: 'admin__header',
      pageTitle: 'CHẾ BIẾN'
    })
  )
}
