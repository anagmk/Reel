const userSchema = require('../model/userModel')
const bcrypt = require('bcrypt')
const saltround = 10
const videoModel = require('../model/videoModel');
const questionModel = require('../model/questionModel');
const userResponseModel = require('../model/userResponseModel');


const loadRegister = (req,res) => {
    res.render('user/register')
}

const loadLogin = (req,res) => {
    let message = null;

    if(req.query.success === 'registered'){
        message= "User created successfully! Please login."
    }

    res.render('user/login', { message })
}

const loadHome = (req,res) => {
    // Redirect users to the video feed
    res.render('user/videoFeed')
}

const registerUser = async (req,res) => {
    try {
        const {email,password} = req.body

        const user = await userSchema.findOne({ email });
        if (user) {
            return res.render('user/register', { message: 'User already exist' });
        }

    const hashPassword = await bcrypt.hash(password, saltround);
    const newUser = new userSchema({ email, password: hashPassword, role: 'user' });
        await newUser.save();

        return res.redirect('/user/login?success=registered');

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userSchema.findOne({ email });
        if (!user) {
            return res.render('user/login', { message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("user/login", { message: "Incorrect credentials" });
        }

    // store session flags and user id
    req.session.user = true;
    req.session.userId = user._id;
        res.redirect('/user/home');

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
}

const logout = (req, res) => {
    req.session.user = null;
    res.redirect('/user/login');
}

const getVideos = async (req, res) => {
    try {
        // Fetch active videos sorted by order
        const videos = await videoModel.find({ isActive: true }).sort({ order: 1 }).lean();

        // For each video, fetch its question (if any)
        const videoIds = videos.map(v => v._id);
        const questions = await questionModel.find({ videoId: { $in: videoIds } }).lean();

        // Map questions by videoId for quick lookup
        const qByVideo = {};
        questions.forEach(q => {
            qByVideo[q.videoId.toString()] = q;
        });

        // Attach question to corresponding video and map to requested shape
        const result = videos.map(v => {
            const q = qByVideo[v._id.toString()] || null;
            return {
                _id: v._id,
                title: v.title,
                videoUrl: v.videoFilePath || v.videoUrl || '',
                order: v.order,
                isActive: v.isActive,
                question: q
                    ? {
                        _id: q._id,
                        questionText: q.questionText,
                        options: Array.isArray(q.options) ? q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) : []
                    }
                    : null
            };
        });

        return res.json({ videos: result });
    } catch (err) {
        console.error('Error in getVideos:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Validate and save user's answer
const submitAnswer = async (req, res) => {
    try {
        const { questionId, selectedOption, videoId } = req.body;
        if (!questionId || typeof selectedOption === 'undefined') {
            return res.status(400).json({ error: 'questionId and selectedOption are required' });
        }

        const question = await questionModel.findById(questionId).lean();
        if (!question) return res.status(404).json({ error: 'Question not found' });

        const correctIndex = question.options.findIndex(o => o.isCorrect);
        const isCorrect = Number(selectedOption) === correctIndex;

        // Save response if user is logged in
        if (req.session && req.session.user) {
            try {
                const userId = req.session.userId || null; // assuming session stores userId elsewhere
                // create or update response
                const resp = new userResponseModel({
                    userId: userId,
                    videoId: videoId || null,
                    questionId,
                    selectedOption: Number(selectedOption),
                    isCorrect
                });
                await resp.save();
            } catch (saveErr) {
                // ignore unique constraint errors for duplicate answers
                if (saveErr.code !== 11000) console.error('Error saving response:', saveErr);
            }
        }

        return res.json({ isCorrect, correctAnswer: correctIndex });
    } catch (err) {
        console.error('Error in submitAnswer:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    registerUser,
    loadRegister,
    loadLogin,
    loadHome,
    login,
    logout,
    getVideos,
    submitAnswer
}