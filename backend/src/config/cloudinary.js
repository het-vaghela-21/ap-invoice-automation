import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import streamifier from 'streamifier';

// Helper to determine if Cloudinary credentials are fully valid and not placeholder stars
const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_NAME;
  const key = process.env.CLOUDINARY_KEY;
  const secret = process.env.CLOUDINARY_SECRET;

  return (
    name && 
    key && 
    secret && 
    name.trim() !== '' && 
    key.trim() !== '' && 
    secret.trim() !== '' && 
    !secret.includes('*')
  );
};

// Configure Cloudinary client if valid credentials are present
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
  });
  console.log('Cloudinary Storage client initialized successfully.');
} else {
  console.warn('WARNING: CLOUDINARY_SECRET is not configured or contains placeholder stars. Local storage fallback will be used for file uploads.');
}

/**
 * Configure Multer middleware
 * Saves files in memory buffers first to stream dynamically to either Cloudinary or Disk.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file extensions
  const allowedExtensions = /pdf|png|jpg|jpeg/;
  const ext = path.extname(file.originalname).toLowerCase();
  const isExtensionValid = allowedExtensions.test(ext);

  // Allowed mime types
  const allowedMimetypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const isMimetypeValid = allowedMimetypes.includes(file.mimetype);

  if (isExtensionValid && isMimetypeValid) {
    return cb(null, true);
  } else {
    return cb(new Error('Invalid file format. Only PDF, PNG, JPG, and JPEG files are allowed.'), false);
  }
};

export const multerUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit as requested
  },
  fileFilter
});

/**
 * Streams file memory buffer to Cloudinary or writes to disk as fallback.
 * @param {Object} file - Express Multer file object
 * @returns {Promise<Object>} Object containing { url, publicId }
 */
export const uploadFile = (file) => {
  return new Promise((resolve, reject) => {
    // 1. If Cloudinary is configured, use it
    if (isCloudinaryConfigured()) {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ap_invoice_automation',
          resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload stream error:', error);
            return reject(new Error('Cloudinary upload failed'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        }
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    } else {
      // 2. Fallback: Save file to local disk folder backend/uploads
      try {
        const uploadDir = path.resolve(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uniqueFilename = `invoice_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        fs.writeFileSync(filePath, file.buffer);

        // Compute local URLs. The server.js should expose the static /uploads folder
        const serverPort = process.env.PORT || 5000;
        const localUrl = `http://localhost:${serverPort}/uploads/${uniqueFilename}`;

        resolve({
          url: localUrl,
          publicId: uniqueFilename // We use the filename as local storage public ID
        });
      } catch (err) {
        console.error('Local file write error:', err);
        reject(new Error('Local file storage failed'));
      }
    }
  });
};

/**
 * Deletes a file resource from Cloudinary or local disk
 * @param {string} publicId - Storage reference identifier
 * @returns {Promise<boolean>} Success state
 */
export const deleteFile = async (publicId) => {
  if (isCloudinaryConfigured()) {
    try {
      // Determine if resource is raw (like PDF) or image
      const isPdf = publicId.endsWith('.pdf') || !publicId.includes('/');
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: isPdf ? 'raw' : 'image'
      });
      return result.result === 'ok';
    } catch (err) {
      console.error('Cloudinary destroy error:', err);
      return false;
    }
  } else {
    try {
      const filePath = path.resolve(process.cwd(), 'uploads', publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Local file deletion error:', err);
      return false;
    }
  }
};
