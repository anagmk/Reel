const adminModel = require('../model/adminModel');
const videoModel = require('../model/videoModel');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const questionModel = require('../model/questionModel');
const fs = require('fs');

// Multer storage for uploader
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    // ensure directory exists
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('video/')) cb(null, true);
  else cb(new Error('Only video files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

// Show upload form for uploader
const loadUploadForm = async (req, res) => {
  try {
    if (!req.session.admin) return res.redirect('/uploader/login');
    res.render('admin/uploadVideo');
  } catch (err) {
    console.error('Error loading upload form:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Handle upload submission
const handleUpload = [
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('No file uploaded');

      const { title, question, option1, option2, option3, option4, correctAnswer, duration, order, showAt } = req.body;

      const videoPath = `/uploads/videos/${req.file.filename}`;
      const video = new videoModel({
        title: title || req.file.originalname,
        videoFilePath: videoPath,
        duration: Number(duration) || 0,
        order: Number(order) || 0
      });
      await video.save();

      const opts = [option1 || '', option2 || '', option3 || '', option4 || ''];
      const correctIndex = typeof correctAnswer !== 'undefined' ? Number(correctAnswer) : -1;
      const optionsArray = opts.map((txt, idx) => ({ text: txt, isCorrect: idx === correctIndex }));

      const q = new questionModel({
        videoId: video._id,
        questionText: question || '',
        options: optionsArray,
        showAt: showAt === 'during' ? 'during' : 'end'
      });
      await q.save();

      return res.redirect('/uploader/dashboard');
    } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof multer.MulterError) return res.status(400).send(err.message);
      return res.status(500).send('Internal Server Error');
    }
  }
];

// Load uploader login page (reuse admin login view)
const loadLogin = async (req, res) => {
  try {
    let message = null;
    if (req.query.success === 'registered') message = 'Uploader registered successfully! Please login.';
    res.render('admin/login', { message });
  } catch (err) {
    console.error('Error loading uploader login:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Handle uploader login - only allow role uploader or developer
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await adminModel.findOne({ email });
    if (!admin) return res.render('admin/login', { message: 'Account does not exist' });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.render('admin/login', { message: 'Invalid password' });

    // Only uploader or developer allowed
    if (admin.role !== 'uploader' && admin.role !== 'developer') {
      return res.render('admin/login', { message: 'Not authorized as uploader' });
    }

    req.session.admin = true;
    req.session.adminRole = admin.role;
    req.session.adminId = admin._id;

    return res.redirect('/uploader/dashboard');
  } catch (err) {
    console.error('Uploader login error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) return res.status(500).send('Internal Server Error');
      res.clearCookie('connect.sid');
      res.redirect('/uploader/login');
    });
  } catch (err) {
    console.error('Uploader logout error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Uploader dashboard - video management only
const loadDashboard = async (req, res) => {
  try {
    if (!req.session.admin) return res.redirect('/uploader/login');
    // allow both uploader and developer
    const role = req.session.adminRole || 'uploader';
    if (role !== 'uploader' && role !== 'developer') return res.status(403).send('Forbidden');

    const videos = await videoModel.find({}).sort({ order: 1 }).lean();
    res.render('admin/uploaderDashboard', { videos });
  } catch (err) {
    console.error('Error loading uploader dashboard:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Load edit video form
const loadEditVideo = async (req, res) => {
  try {
    const id = req.params.id;
    const video = await videoModel.findById(id).lean();
    if (!video) return res.redirect('/uploader/dashboard');
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
      // support option field names from both upload and edit forms
      // edit form uses option0..option3, upload form used option1..option4
      const existingOpts = (q.options || []).map(o => o.text || '');
      const opts = [];
      for (let i = 0; i < 4; i++) {
        const name0 = `option${i}`;
        const name1 = `option${i + 1}`;
        let val = typeof req.body[name0] !== 'undefined' ? req.body[name0] : (typeof req.body[name1] !== 'undefined' ? req.body[name1] : undefined);
        if (typeof val === 'string') val = val.trim();
        // fallback to existing option text if new value is missing/empty
        if (!val) val = existingOpts[i] || `Option ${i + 1}`;
        opts.push(val);
      }

      const correctIndex = typeof correctAnswer !== 'undefined' && correctAnswer !== null ? Number(correctAnswer) : -1;
      q.questionText = questionText || q.questionText;
      q.options = opts.map((txt, idx) => ({ text: txt, isCorrect: idx === correctIndex }));
      q.showAt = showAt === 'during' ? 'during' : 'end';
      await q.save();
    }

    res.redirect('/uploader/dashboard');
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
    if (!video) return res.redirect('/uploader/dashboard');

    // delete video file if exists
    if (video.videoFilePath) {
      const filePath = path.join(__dirname, '..', video.videoFilePath);
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }

    await questionModel.deleteOne({ videoId: video._id });
    await videoModel.findByIdAndDelete(id);

    res.redirect('/uploader/dashboard');
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  loadLogin,
  login,
  logout,
  loadDashboard,
  loadUploadForm,
  handleUpload,
  loadEditVideo,
  updateVideo,
  deleteVideo
};
