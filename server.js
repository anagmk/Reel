require('dotenv').config();

const express =require('express')
const app = express();
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const uploaderRoutes = require('./routes/uploader')
const path = require('path')
const mongoose = require('mongoose')
const connectDB = require('./db/connectDB')
const session = require('express-session')
const nocache = require('nocache');
const hbs = require('hbs');
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/videos';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 104857600;
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisClient = redis.createClient({
  socket: {
    host: '127.0.0.1', // Explicitly set Redis host
    port: 6379         // Explicitly set Redis port
  }
});

connectDB();

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

app.use(nocache())
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}))

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','hbs');

// Register handlebars helpers
hbs.registerHelper('eq', function(a, b) {
    return String(a) === String(b);
});
//static assets
app.use(express.static('public'))
app.use(express.urlencoded({extended : true}))
app.use(express.json())

app.use('/user',userRoutes)
app.use('/admin',adminRoutes)
app.use('/uploader', uploaderRoutes)

app.use('/uploads', express.static('uploads'))
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})