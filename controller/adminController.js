const adminModel = require("../model/adminModel");
const bcrypt = require("bcrypt");
const usermodal = require("../model/userModel");
const saltround = 10;
const questionModel = require('../model/questionModel');
const videoModel = require('../model/videoModel');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // configure multer for file uploads

// ================= LOAD LOGIN =================
const loadLogin = async (req, res) => {
  try {
    let message = null;
    
    if (req.query.success === 'registered') {
      message = 'Admin registered successfully! Please login.';
    }
    
    res.render("admin/login", { message });  
  } catch (error) {
    console.error("Error loading login page:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res.render("admin/login", { message: "Admin does not exist" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (!isMatch) {
      return res.render("admin/login", { message: "Invalid password" });
    }

  req.session.admin = true;
  req.session.adminRole = admin.role || 'developer';
  // Redirect uploaders to the uploader dashboard, developers to admin dashboard
  if ((admin.role || 'developer').toLowerCase() === 'uploader') {
    return res.redirect('/uploader/dashboard');
  }
  return res.redirect('/admin/dashboard');

  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ================= LOAD REGISTER =================
const loadRegister = async (req, res) => {
  try {
    res.render("admin/register");
  } catch (error) {
    console.error("Error loading register page:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ================= REGISTER =================
const registerAdmin = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existingAdmin = await adminModel.findOne({ email });
    if (existingAdmin) {
      return res.render("admin/register", { message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, saltround);

    const newAdmin = new adminModel({ 
      email, 
      password: hashedPassword,
      role: role || 'developer'
    });
    await newAdmin.save();

    // If the created admin is an uploader, redirect to the uploader login flow
    if ((role || '').toLowerCase() === 'uploader') {
      return res.redirect('/uploader/login?success=registered');
    }

    res.redirect('/admin/login?success=registered');

  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ================= LOAD DASHBOARD =================
const loadDashboard = async (req, res) => {
  try {
    const admin = req.session.admin;
    if (!admin) return res.redirect('/admin/login');

    const users = await usermodal.find({});
    const videos = await videoModel.find({}).sort({ order: 1 }).lean();

    // map for template: format date and role flags
    const accounts = users.map(u => ({
      _id: u._id,
      email: u.email,
      role: u.role || 'user',
      createdAt: u.createdAt ? u.createdAt.toLocaleString() : '',
      isUser: (u.role || 'user') === 'user'
    }));

    let message = null;
    if (req.query.success === 'deleted') {
      message = 'User deleted successfully';
    } else if (req.query.success === 'updated') {
      message = 'User updated successfully';
    }

    // pass `accounts` and `videos` so developer dashboard can show both
    res.render('admin/developerDashboard', { accounts, videos, message });

  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
};

// ================= DELETE USER ================= (NEW)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    await usermodal.findByIdAndDelete(userId);
    
    res.redirect("/admin/dashboard?success=deleted");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ================= LOAD EDIT USER ================= (NEW)
const loadEditUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await usermodal.findById(userId);
    
    if (!user) {
      return res.redirect("/admin/dashboard");
    }
    
    res.render("admin/editUser", { user });
  } catch (error) {
    console.error("Error loading edit page:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ================= UPDATE USER ================= (NEW)
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, password } = req.body;
    
    const updateData = { email };
    
    // Only update password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, saltround);
      updateData.password = hashedPassword;
    }
    
    await usermodal.findByIdAndUpdate(userId, updateData);
    
    res.redirect("/admin/dashboard?success=updated");
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ================= LOGOUT =================
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send('Internal Server Error');
      }
      // clear session cookie to prevent browser from reshowing cached pages
      res.clearCookie('connect.sid');
      res.redirect('/admin/login');
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Developer dashboard: full features (users + videos)
const loadDeveloperDashboard = async (req, res) => {
  try {
    const admin = req.session.admin;
    const role = req.session.adminRole || 'developer';
    if (!admin) return res.redirect('/admin/login');
    // Only developers can access developer dashboard
    if (role !== 'developer') return res.status(403).send('Forbidden');

    const users = await usermodal.find({});
    const videos = await videoModel.find({}).sort({ order: 1 }).lean();

    const accounts = users.map(u => ({
      _id: u._id,
      email: u.email,
      role: u.role || 'user',
      createdAt: u.createdAt ? u.createdAt.toLocaleString() : '',
      isUser: (u.role || 'user') === 'user'
    }));

    res.render('admin/developerDashboard', { accounts, videos });
  } catch (err) {
    console.error('Error loading developer dashboard:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Load edit video form
const loadEditVideo = async (req, res) => {
  try {
    const id = req.params.id;
    const video = await videoModel.findById(id).lean();
    if (!video) return res.redirect('/admin/developer');
    const question = await questionModel.findOne({ videoId: video._id }).lean();
    res.render('admin/editVideo', { video, question });
  } catch (err) {
    console.error('Error loading edit video:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Update video metadata and question
const updateVideo = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, order, questionText, correctAnswer, showAt } = req.body;
    await videoModel.findByIdAndUpdate(id, { title, order: Number(order) || 0 });

    const q = await questionModel.findOne({ videoId: id });
    if (q) {
      const existingOpts = (q.options || []).map(o => o.text || '');
      const opts = [];
      for (let i = 0; i < 4; i++) {
        const name = `option${i}`;
        let val = req.body[name]?.trim() || existingOpts[i] || `Option ${i + 1}`;
        opts.push(val);
      }

      const correctIndex = Number(correctAnswer) || -1;
      q.questionText = questionText || q.questionText;
      q.options = opts.map((txt, idx) => ({ text: txt, isCorrect: idx === correctIndex }));
      q.showAt = showAt === 'during' ? 'during' : 'end';
      await q.save();
    }

    res.redirect('/admin/developer');
  } catch (err) {
    console.error('Error updating video:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Delete video (and related question + file)
const deleteVideo = async (req, res) => {
  try {
    const id = req.params.id;
    const video = await videoModel.findById(id);
    if (!video) return res.redirect('/admin/developer');

    if (video.videoFilePath) {
      const filePath = path.join(__dirname, '..', video.videoFilePath);
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }

    await questionModel.deleteOne({ videoId: video._id });
    await videoModel.findByIdAndDelete(id);

    res.redirect('/admin/developer');
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Load upload form
const loadUploadForm = async (req, res) => {
  try {
    if (!req.session.admin) return res.redirect('/admin/login');
    res.render('admin/uploadVideo');
  } catch (err) {
    console.error('Error loading upload form:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Handle video upload
const handleUpload = [
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('No file uploaded');

      const { title, duration, order } = req.body;
      const videoPath = `/uploads/videos/${req.file.filename}`;
      const video = new videoModel({
        title: title || req.file.originalname,
        videoFilePath: videoPath,
        duration: Number(duration) || 0,
        order: Number(order) || 0
      });
      await video.save();

      res.redirect('/admin/developer');
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).send('Internal Server Error');
    }
  }
];

module.exports = {
  loadLogin, 
  login, 
  loadRegister,
  registerAdmin,
  loadDashboard,
  deleteUser,       // NEW
  loadEditUser,     // NEW
  updateUser,       // NEW
  logout,
  loadDeveloperDashboard,
  loadEditVideo,
  updateVideo,
  deleteVideo,
  loadUploadForm,
  handleUpload
};