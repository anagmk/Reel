const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController'); 
const auth = require('../middleware/auth');
const adminModel = require('../model/adminModel');
const questionModel = require('../model/questionModel');
const videoModel = require('../model/videoModel');
const userResponseModel = require('../model/userResponseModel');

router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);

// Only developers can create new admins (including uploaders)
// If there are no admins in the DB allow public registration (first-run). Otherwise require developer.
router.get('/register', async (req, res) => {
	try {
		const count = await adminModel.countDocuments();
		if (count === 0) return adminController.loadRegister(req, res);

		// run auth middleware then call controller
		auth.checkAdminRole('developer')(req, res, (err) => {
			if (err) {
				console.error('Auth middleware error on GET /register:', err);
				return res.status(500).send('Internal Server Error');
			}
			return adminController.loadRegister(req, res);
		});
	} catch (err) {
		console.error('Error checking admin count for GET /register:', err);
		res.status(500).send('Internal Server Error');
	}
});

router.post('/register', async (req, res) => {
	try {
		const count = await adminModel.countDocuments();
		if (count === 0) return adminController.registerAdmin(req, res);

		auth.checkAdminRole('developer')(req, res, (err) => {
			if (err) {
				console.error('Auth middleware error on POST /register:', err);
				return res.status(500).send('Internal Server Error');
			}
			return adminController.registerAdmin(req, res);
		});
	} catch (err) {
		console.error('Error checking admin count for POST /register:', err);
		res.status(500).send('Internal Server Error');
	}
});

router.get('/dashboard', auth.checkAdminSession, adminController.loadDashboard);

// Developer (full access) dashboard
router.get('/developer', auth.checkAdminRole('developer'), adminController.loadDeveloperDashboard);

// Video uploads are handled under /uploader namespace

// User management routes (NEW)
router.get('/user/edit/:id', auth.checkAdminSession, adminController.loadEditUser);
router.post('/user/edit/:id', auth.checkAdminSession, adminController.updateUser);
router.get('/user/delete/:id', auth.checkAdminSession, adminController.deleteUser);

// Video edit/delete routes
router.get('/video/edit/:id', auth.checkAdminRole('developer'), adminController.loadEditVideo);
router.post('/video/edit/:id', auth.checkAdminRole('developer'), adminController.updateVideo);
router.get('/video/delete/:id', auth.checkAdminRole('developer'), adminController.deleteVideo);

// Video upload route
router.get('/upload-video', auth.checkAdminRole('developer'), adminController.loadUploadForm);
router.post('/upload-video', auth.checkAdminRole('developer'), adminController.handleUpload);

router.get('/test-models', auth.checkAdminSession, async (req, res) => {
	try {
		// quick sanity endpoint to verify models are accessible
		const qCount = await questionModel.countDocuments();
		const vCount = await videoModel.countDocuments();
		const rCount = await userResponseModel.countDocuments();
		res.json({ questions: qCount, videos: vCount, responses: rCount });
	} catch (err) {
		console.error('Error in /test-models:', err);
		res.status(500).send('Error testing models');
	}
});

router.get('/logout', auth.checkAdminSession, adminController.logout);

module.exports = router;