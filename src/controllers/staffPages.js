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