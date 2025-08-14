import express from 'express'
import userRoutes from './user.js'
import inventoryRoutes from './inventory.js'
import adminRoutes from './admin.js'
import menuRoutes from './menu.js'
import staffRRoutes from './staff.js'
import uploadRouter from './upload.js'

const router = express.Router()

router.use('/', userRoutes)
router.use('/', inventoryRoutes)
router.use('/', menuRoutes)
router.use('/', staffRRoutes)
router.use('/', adminRoutes)
router.use('/', uploadRouter)

export default router