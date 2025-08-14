import { getPageData } from '../helpers/pageDataHelper.js'


export const tablePage = (req, res) => {
    res.render('staff/tables', 
        getPageData(req, 'Quản Lý Bàn', 'Table', 
            {
                headerClass: 'staff__header',
                pageTitle: 'QUẢN LÝ BÀN'
            }
        )
    )    
}

export const ordersPage = (req, res) => {
    res.render('staff/orders', 
        getPageData(req, 'Đặt món', 'Orders', 
            {
                headerClass: 'staff__header',
                pageTitle: 'ĐẶT MÓN'
            }
        )
    )    
}

export const foodsPage = (req, res) => {
    res.render('staff/foods', 
        getPageData(req, 'Quản Lý Món Ăn', 'Foods', 
            {
                headerClass: 'staff__header',
                pageTitle: 'Quản Lý Món Ăn'
            }
        )
    )    
}

export const billsPage = (req, res) => {
    res.render('staff/bills', 
        getPageData(req, 'Hóa Đơn', 'Bills', 
            {
                headerClass: 'staff__header',
                pageTitle: 'HÓA ĐƠN'
            }
        )
    )    
}

export const schedulePage = (req, res) => {
    res.render('staff/schedule', 
        getPageData(req, 'Lịch Làm Việc', 'Schedule', 
            {
                headerClass: 'staff__header',
                pageTitle: `LỊCH LÀM VIỆC của ${req.user.username}`
            }
        )
    )    
}
