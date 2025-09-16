import express from 'express'
import { orgManagementPage } from '../../pages/index.js'
import * as org from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import isAdmin from '../../helpers/isAdmin.js'
import { isPermit } from '../../helpers/isPermit.js'

const router = express.Router()

router.get('/org/:orgId/dashboard', isAuthenticated, isAdmin, org.getOrgDashboard)
router.get('/organizations', isAuthenticated, isAdmin, orgManagementPage) // get Page
router.get('/api/organizations', isAuthenticated, isAdmin, org.getActiveOrganizations) // get active organizations
router.get('/api/organization/:id', isAuthenticated, isPermit("Admin", "Org"), org.getOrgById) // get organization by id
router.get('/api/organizations/get', isAuthenticated, isAdmin, org.getAllOrganizations) // get all organizations
router.post('/api/organization/create', org.createOrganization) // post
router.post('/api/admin/organization/create', isAuthenticated, isAdmin, org.createOrg) // post
router.post(`/api/organization/update/:id`, isAuthenticated, isPermit("Admin", "Org"), org.updateOrg) // post
router.post('/api/admin/organization/deletes', isAuthenticated, isAdmin, org.deleteOrgs) // post

export default router
