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
import uploadRouter from '../modules/upload/route.js'

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
router.use('/', menuCategoryRoutes)
router.use('/', menuItemRoutes)
router.use('/', recipeRoutes)
router.use('/', uploadRouter)
router.use('/', tableRoutes)
router.use('/', orderRoutes)
export default router