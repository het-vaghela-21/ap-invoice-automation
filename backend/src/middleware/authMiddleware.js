import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to authenticate requests via JWT.
 * Validates the token and attaches the user document to req.user.
 */
export const authenticateUser = async (req, res, next) => {
  let token;

  // Check for Token in the Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from Bearer <token>
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB, excluding password
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Not authorized, user not found'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          status: 'error',
          message: 'User account has been deactivated'
        });
      }

      // Attach user object to request
      req.user = user;
      next();
    } catch (error) {
      console.error(`JWT verification failed: ${error.message}`);
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, token validation failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, authorization token is missing'
    });
  }
};

/**
 * Middleware to restrict route access to specific role enums.
 * @param {...string} roles - List of roles permitted to access the route
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: Access restricted for role - ${req.user.role}`
      });
    }

    next();
  };
};
