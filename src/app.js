import express from 'express';
import connectDB from './configs/db.js';
import cookieParser from "cookie-parser";
import cors from 'cors';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import lusca from 'lusca';
import morgan from 'morgan';
import router from './routes/common.js';
import passport from './configs/passport.js';
import session from 'express-session';
import MongoStore from "connect-mongo";
import './modules/payroll/auto.js'

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT;
app.set('port', port || 8000);

// Set the view engine to EJS
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Connect Mongo
connectDB();

// Debug logger
// app.use(morgan('dev'));

// Memomry leak
app.set('trust proxy', 1);

// Middleware
app.use(compression()); // Compress responses
app.use(helmet()); // Security middleware
app.use(cors());  // Allow API requests from different origins (CORS)
app.use(express.json());  // Parse incoming JSON requests (req.body)
app.use(cookieParser()); // Read & parse cookie from req.cookies

//session
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  mongoOptions: {
    // autoReconnect: true
  }
});
// Listen for the 'connected' event on the MongoStore instance
sessionStore.on('connected', () => {
  console.log('MongoStore is connected');
  // Perform actions you want to take when MongoStore is ready
});
// Listen for the 'error' event on the MongoStore instance
sessionStore.on('error', (error) => {
  console.error('MongoStore connection error:', error);
  // Handle the error as needed
});

// session config
app.use(
    session({
      secret: process.env.SESSION_SECRET,
      rolling: true,
      resave: true,
      saveUninitialized: false, // true: csrf
      store: sessionStore,
      cookie: {
        secure: false // false: local (http)
        // maxAge: 24*60*60000
      }
    })
  );

// ==================================
// passport
app.use(passport.initialize());
app.use(passport.session());

app.use(lusca({ 
  // csrf: true,        // CSRF protection
  xframe: 'SAMEORIGIN', 
  xssProtection: true 
}));

// Custom Middleware
app.use((req, res, next) => {
  res.locals.currentPath = req.path; 
  next();
});

// Uploads Static
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Register routes
app.use('/', router);

app.use((req, res) => {
    res.status(404).render('errors/error-404', { title: 'Page Not Found' });
});

export default app;
