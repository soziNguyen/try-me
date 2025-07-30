import express from 'express';
import connectDB from './configs/db.js';
import cors from 'cors';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import router from './routes/common.js';
import passport from './configs/passport.js';
import session from 'express-session';
import MongoStore from "connect-mongo";

// dotenv.config();


const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT;
app.set('port', port || 8000);

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));

app.use(express.static(path.join(__dirname, '/public')));

// Connect Mongo
connectDB();

// Middleware
app.use(cors());  // Allow API requests from different origins (CORS)
app.use(express.json());  // Parse incoming JSON requests (req.body)

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

app.use((req, res, next) => {
  res.locals.currentPath = req.path; 
  next();
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use('/', router);

export default app;
