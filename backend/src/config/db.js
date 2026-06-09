import mongoose from 'mongoose';

/**
 * Connects to MongoDB database using Mongoose.
 * Logs connection status or errors.
 */
const connectDB = async () => {
  try {
    const connUri = process.env.MONGO_URI;
    if (!connUri) {
      console.warn('WARNING: MONGO_URI is not defined in the environment variables. Database functionality will not be available.');
      return null;
    }

    const options = {
      autoIndex: true, // Build indexes in production if needed, or set false if performance is critical
    };

    const conn = await mongoose.connect(connUri, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Do not crash the application in development, but print the error stack
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
