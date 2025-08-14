import express from 'express'
import * as page from '../controllers/pages.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

router.get('/menu/lists',       isAuthenticated, isPermit('Admin', 'Org'), page.menuPage)
router.get('/menu/categories',  isAuthenticated, isPermit('Admin', 'Org'), page.menuCategoryPage)
router.get('/menu/recipes',     isAuthenticated, isPermit('Admin', 'Org'), page.recipePage)
router.get('/menu/combos',      isAuthenticated, isPermit('Admin', 'Org'), page.comboPage)
router.get('/menu/prices',      isAuthenticated, isPermit('Admin', 'Org'), page.historyPricePage)

export default router