import express from 'express'
import { orgManagementPage } from '../controllers/pages.js'
import * as org from '../controllers/organization.js'
import isAuthenticated from "../helpers/isAuthenticated.js"
import isAdmin from '../helpers/isAdmin.js'
import { isPermit } from '../helpers/isPermit.js'

const router = express.Router()

router.get('/organizations', isAuthenticated, isAdmin, orgManagementPage) // get Page
router.get('/api/organizations', isAuthenticated, isPermit('Admin', 'Org'), org.getActiveOrganizations) // get all organizations
router.get('/api/organizations/get', isAuthenticated, isAdmin, org.getAllOrganizations) // get all organizations
router.post('/api/organization/create', isAuthenticated, isAdmin, org.createOrganization)   // post
router.post('/api/admin/organization/create', isAuthenticated, isAdmin, org.createOrg)   // post
router.post(`/api/organization/update/:id`, isAuthenticated, isAdmin, org.updateOrg)   // post
router.post('/api/admin/organization/deletes', isAuthenticated, isAdmin, org.deleteOrgs)   // post

export default router