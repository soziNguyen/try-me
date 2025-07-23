import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const mongoOptions = { autoIndex: true };

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, mongoOptions);
    console.log('✅ MongoDB connected ');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }
};

export default connectDB;