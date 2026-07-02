import { Router, Response } from 'express';
import multer from 'multer';
import { adminGuard, AuthenticatedRequest as AdminRequest } from '../../middleware/adminGuard.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { uploadImageToCloudinary } from './cloudinary.service.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Security helper: Block uploads with executable extensions
const isExecutableExtension = (filename: string): boolean => {
  if (!filename) return false;
  const ext = filename.split('.').pop()?.toLowerCase();
  const blocked = ['exe', 'bat', 'cmd', 'sh', 'js', 'ts', 'vbs', 'scr', 'com', 'pif', 'msi', 'jar'];
  return !!ext && blocked.includes(ext);
};

/**
 * POST /api/uploads/image
 * Admin only — upload product images
 */
router.post('/image', adminGuard, upload.single('image'), async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'No image file provided.' });
      return;
    }

    if (isExecutableExtension(req.file.originalname)) {
      res.status(400).json({ status: 'error', message: 'Executable files are strictly forbidden.' });
      return;
    }

    // Upload to Cloudinary under products folder
    const result = await uploadImageToCloudinary(req.file.buffer, 'deevuh/products');

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/uploads/review-image
 * Authenticated — upload review images
 */
router.post('/review-image', authMiddleware, upload.single('image'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'No image file provided.' });
      return;
    }

    if (isExecutableExtension(req.file.originalname)) {
      res.status(400).json({ status: 'error', message: 'Executable files are strictly forbidden.' });
      return;
    }

    // Upload to Cloudinary under reviews folder
    const result = await uploadImageToCloudinary(req.file.buffer, 'deevuh/reviews');

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
