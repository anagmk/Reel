const express = require('express')
const userController = require('../controller/userController');
const auth = require('../middleware/auth');

const router = express.Router();


router.get('/login',userController.loadLogin);
router.post('/login',userController.login)
router.get('/register',userController.loadRegister);
router.post('/register',userController.registerUser)
router.get('/home',auth.checkSession,userController.loadHome)
router.get('/logout',auth.checkSession,userController.logout)
router.get('/videos',auth.checkSession,userController.getVideos);
router.post('/submit-answer',auth.checkSession,userController.submitAnswer);



module.exports = router