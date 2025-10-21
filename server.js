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
// Only configure Redis if the environment explicitly provides connection info.
// This avoids noisy ECONNREFUSED logs during local development when Redis isn't running.
const isRedisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST || process.env.REDIS_PORT);
let redisClient = null;
if (isRedisConfigured) {
  // Create redis client. Prefer REDIS_URL if provided (supports rediss:// for TLS).
  redisClient = process.env.REDIS_URL
    ? redis.createClient({ url: process.env.REDIS_URL })
    : redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379
        }
      });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis client connecting...'));
  redisClient.on('ready', () => console.log('Redis client ready'));
}

connectDB();

app.use(nocache());

// We'll initialize the session store after attempting to connect to Redis.
(async () => {
  let sessionStore;
    try {
    if (redisClient) {
      // Attempt to connect but don't let a rejected promise crash the app.
      // We'll wait up to 500ms for the client to become ready and otherwise fall back.
      let connected = false;
      redisClient.connect().catch((err) => {
        // connect() rejection is expected when Redis isn't available; log and continue
        console.error('Redis connect() failed:', err && err.message ? err.message : err);
      });

      // Wait for ready or timeout
      connected = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve(false);
        }, 500);
        redisClient.once('ready', () => {
          clearTimeout(timer);
          resolve(true);
        });
      });

      if (connected && redisClient.isOpen) {
        console.log('Connected to Redis');
        sessionStore = new RedisStore({ client: redisClient });
      } else {
        console.warn('Redis not ready within timeout; proceeding without Redis session store');
      }
    }
  } catch (err) {
    console.error('Unexpected error while initializing Redis (will fall back to MemoryStore):', err);
  }

  // Fallback to MemoryStore (not suitable for production) when Redis isn't available
  if (!sessionStore) {
    sessionStore = new session.MemoryStore();
    console.warn('Using in-memory session store. This is not suitable for production.');
  }

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  }));

  // --- Remaining app setup and server start moved here so session is configured first ---

  //view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine','hbs');

  // Register handlebars helpers
  hbs.registerHelper('eq', function(a, b) {
      return String(a) === String(b);
  });
  //static assets
  app.use(express.static('public'));
  app.use(express.urlencoded({extended : true}));
  app.use(express.json());

  app.use('/user',userRoutes);
  app.use('/admin',adminRoutes);
  app.use('/uploader', uploaderRoutes);

  app.use('/uploads', express.static('uploads'));
  app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
  });

})();

// (App setup and server start are performed after session initialization above.)