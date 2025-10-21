const express = require('express');
const router = express.Router();
const uploaderController = require('../controller/uploaderController');
const auth = require('../middleware/auth');

// Uploader login (separate URL space)
router.get('/login', uploaderController.loadLogin);
router.post('/login', uploaderController.login);
router.get('/logout', uploaderController.logout);

// Uploader dashboard
router.get('/dashboard', auth.checkAdminRole('uploader'), uploaderController.loadDashboard);

// Upload routes
router.get('/upload-video', auth.checkAdminRole('uploader'), uploaderController.loadUploadForm);
router.post('/upload-video', auth.checkAdminRole('uploader'), uploaderController.handleUpload);

// Video edit/delete routes
router.get('/video/edit/:id', auth.checkAdminRole('uploader'), uploaderController.loadEditVideo);
router.post('/video/edit/:id', auth.checkAdminRole('uploader'), uploaderController.updateVideo);
router.get('/video/delete/:id', auth.checkAdminRole('uploader'), uploaderController.deleteVideo);

module.exports = router;
