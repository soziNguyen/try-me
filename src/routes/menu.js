import express from 'express'
import * as page from '../controllers/pages.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import isAdmin from '../helpers/isAdmin.js'

const router = express.Router()

router.get('/menu/lists', isAuthenticated, isAdmin, page.menuPage)
router.get('/menu/categories', isAuthenticated, isAdmin, page.menuCategoryPage)
router.get('/menu/recipes', isAuthenticated, isAdmin, page.recipePage)
router.get('/menu/combos', isAuthenticated, isAdmin, page.comboPage)
router.get('/menu/prices', isAuthenticated, isAdmin, page.historyPricePage)

export default router