import { getPageData } from '../helpers/pageDataHelper.js'

//=============================================
//================= USER ======================

// User Management Page
export const userPage = async (req, res) => {
    res.render('users/user',
    getPageData(req, 'Dashboard', 'User', 
        { headerClass: 'admin__header' },
        { pageTitle: 'QUẢN LÝ NHÂN VIÊN' }
    )
    )
}

// User Log In Page
export const logInPage = async (req, res) => {
    res.render('users/log_in', 
        getPageData(req, 'Log In', { headerClass: 'staff__header' })
    )
}

// User Sign Up Page
export const signUpPage = async (req, res) => {
    res.render('users/sign_up', 
        getPageData(req, 'Sign Up', { headerClass: 'staff__header' })
    )
}

// User Forgot Password Page
export const forgotPasswordPage = async (req, res) => {
    res.render('users/forgot_password', 
        getPageData(req, 'Forgot Password', { headerClass: 'staff__header' })
    )
}

// User Reset Password Page
export const resetPasswordPage = async (req, res) => {
    res.render('users/reset_password', 
        getPageData(req, 'Reset Password', { headerClass: 'staff__header' })
    )
}

// Render Dashboard By Role (Admin / Staff)
export const dashboard = async (req, res) => {
    if (req.user && req.user.role === 'Admin') {
        return res.render('users/admin_dashboard', 
            getPageData(req, 'Dashboard', 'Dashboard', { headerClass: 'admin__header' })
        )
    } else {
        return res.render('users/staff_dashboard', 
            getPageData(req, 'Dashboard', 'Dashboard', { headerClass: 'staff__header' })
        )
    }
}

// =================================================
// ================== INVENTORY ====================

// Ingredient Management
export const ingredientPage = (req, res) => {
    res.render('inventory/ingredient', 
        getPageData(req, 'Quản lý nguyên liệu', 'Ingredient', 
            {
                headerClass: 'admin__header',
                pageTitle: 'QUẢN LÝ NGUYÊN LIỆU'            
            }
        )
    )
}

// Ingredient Category
export const categoryPage = (req, res) => {
    res.render('inventory/ingredient_cat', 
        getPageData(req, 'Quản lý danh mục nguyên liệu', 'Category', 
            {
                headerClass: 'admin__header',
                pageTitle: 'QUẢN LÝ DANH MỤC NGUYÊN LIỆU'
            }
        )
    )
}

// Warehouse
export const warehousePage = (req, res) => {
    res.render('inventory/warehouse', 
        getPageData(req, 'Quản lý nhà kho', 'Warehouse', 
            {
                headerClass: 'admin__header',
                pageTitle: 'QUẢN LÝ NHÀ KHO'
            }
        )
    )
}

// Supplier
export const supplierPage = (req, res) => {
    res.render('inventory/supplier', 
        getPageData(req, 'Quản lý nhà cung cấp', 'Supplier', 
            {
                headerClass: 'admin__header',
                pageTitle: 'QUẢN LÝ NHÀ CUNG CẤP'
            }
        )
    )
}

// Import
export const importPage = (req, res) => {
    res.render('inventory/stock_entry', 
        getPageData(req, 'Phiếu nhập kho', 'Import', 
            {
                headerClass: 'admin__header',
                pageTitle: 'PHIẾU NHẬP KHO'
            }
        )
    )
}

// Export
export const exportPage = (req, res) => {
    res.render('inventory/stock_issue',
        getPageData(req, 'Phiếu Xuất Kho', 'Export', 
            {
                headerClass: 'admin__header',
                pageTitle: 'PHIẾU XUẤT KHO'
            }
        )
    )
}

// Movement
export const movementPage = (req, res) => {
    res.render('inventory/stock_movement', 
        getPageData(req, 'Lịch Sử Nhập - Xuất Kho', 'Movement', 
            {
                headerClass: 'admin__header',
                pageTitle: 'LỊCH SỬ NHẬP - XUẤT KHO'
            }
        )
    )
}

// New Stock Entry
export const newStockEntryPage = (req, res) => {
    const stockEntryId = req.params.id
    const mode = req.query.mode || ''

    const isNew = mode === 'new' ? 'Nhập Nguyên Liệu Mới' : 'Chi Tiết Nhập Nguyên Liệu'
    res.render('inventory/stock_entry_detail', 
        getPageData(req, isNew, 'New Stock Entry', {
            stockEntryId: stockEntryId
        })
    )
}