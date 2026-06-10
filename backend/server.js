import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './src/config/db.js';
import healthRoutes from './src/routes/healthRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import poRoutes from './src/routes/poRoutes.js';
import invoiceRoutes from './src/routes/invoiceRoutes.js';
import validationRoutes from './src/routes/validationRoutes.js';
import vendorRoutes from './src/routes/vendorRoutes.js';
import auditRoutes from './src/routes/auditRoutes.js';
import workflowRoutes from './src/routes/workflowRoutes.js';
import exceptionRoutes from './src/routes/exceptionRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import errorHandler from './src/middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database Connection
connectDB();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/po', poRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Expose uploads directory statically for local storage fallback
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Centralized Error Handler Middleware
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Backend Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default app;
