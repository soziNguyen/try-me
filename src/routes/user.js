import express from 'express';
import * as userController from '../controllers/user.js';
import { userPage, logInPage, signUpPage, forgotPasswordPage, resetPasswordPage, dashboard } from '../controllers/pages.js'
import { createOrganization } from '../controllers/organization.js';
import isAuthenticated from "../helpers/isAuthenticated.js";
import { isPermit } from '../helpers/isPermit.js';

const router = express.Router();

// Staff Dashboard
router.get('/', isAuthenticated, dashboard);

// =====================user routes==================================
router.get('/users',                isAuthenticated, isPermit('Admin', 'Org'), userPage);     // render view
router.get('/api/users',            isAuthenticated, isPermit('Admin', 'Org'), userController.getUsers);     // get data json
router.get('/api/users/:id',        isAuthenticated,                           userController.getUser);      // get data json
router.post('/api/users/create',    isAuthenticated, isPermit('Admin', 'Org'), userController.createUser);   // post
router.post('/api/organization/create',                                        createOrganization);   // post
router.put('/api/users/update/:id', isAuthenticated,                           userController.updateUser);   // post
router.post('/api/users/delete',    isAuthenticated, isPermit('Admin', 'Org'), userController.deleteUsers);  // post

router.get('/signup', signUpPage);       // render view
router.get('/login', logInPage);         // render view
router.post('/api/users/login', userController.logIn);  // post
router.post('/api/users/logout', userController.logOut)

router.get('/login/identify', forgotPasswordPage);               // render view
router.post('/api/users/forgot', userController.forgotPassword);                // post
router.get('/reset-password/:token', resetPasswordPage);         // render view
router.post('/api/users/reset-password/:token', userController.resetPassword);  // post


export default router;