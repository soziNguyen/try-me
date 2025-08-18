import express from 'express'
import userRoutes from '../module/user/route.js'
import adminRoutes from '../module/admin/route.js'
import ingredientRoutes from '../module/inventory/ingredient/route.js'
import ingredientCategoryRoutes from '../module/inventory/ingredient-category/route.js'
import ingredientStockRoute from '../module/inventory/ingredient-stock/route.js'
import organizationRoutes from '../module/organization/route.js'
import stockEntryRoutes from '../module/stock-transaction/stock-entry/route.js'
import stockIssueRoutes from '../module/stock-transaction/stock-issue/route.js'
import stockTransferRoutes from '../module/stock-transaction/stock-transfer/route.js'
import stockHistoryRoutes from '../module/stock-transaction/stock-history/route.js'
import supplierRoutes from '../module/inventory/supplier/route.js'
import warehouseRoutes from '../module/inventory/warehouse/route.js'
import tableRoutes from '../module/table/route.js'
import foodRoutes from '../module/food/route.js'
import orderRoutes from '../module/order/route.js'
import inventoryRoutes from './inventory.js'
import menuRoutes from './menu.js'
import uploadRouter from './upload.js'

const router = express.Router()

router.use('/', userRoutes)
router.use('/', adminRoutes)
router.use('/', ingredientRoutes)
router.use('/', ingredientCategoryRoutes)
router.use('/', ingredientStockRoute)
router.use('/', organizationRoutes)
router.use('/', stockEntryRoutes)
router.use('/', stockIssueRoutes)
router.use('/', stockTransferRoutes)
router.use('/', stockHistoryRoutes)
router.use('/', supplierRoutes)
router.use('/', warehouseRoutes)
router.use('/', inventoryRoutes)
router.use('/', menuRoutes)
router.use('/', organizationRoutes)
router.use('/', uploadRouter)
router.use('/', tableRoutes)
router.use('/', foodRoutes)
router.use('/', orderRoutes)
export default router