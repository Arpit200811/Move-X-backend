import express, { Request, Response } from 'express';
import { upload } from '../config/multer';
import { auth } from '../config/authMiddleware';

const router = express.Router();

// Single file upload - used by KYC, Proof of Delivery, Avatar
router.post('/', auth as any, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file received in the request' });
  }
  // Build the absolute accessible URL
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, url: fileUrl, filename: req.file.filename });
});

// Public upload for registration (No auth required)
router.post('/public', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received in the request' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, url: fileUrl, filename: req.file.filename });
});

// Multiple files upload (e.g. both License + ID in one call)
router.post('/multi', auth as any, upload.fields([{ name: 'license', maxCount: 1 }, { name: 'idCard', maxCount: 1 }]), (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files || Object.keys(files).length === 0) {
    return res.status(400).json({ success: false, message: 'No files received' });
  }
  const urls: Record<string, string> = {};
  for (const key of Object.keys(files)) {
    urls[key] = `${req.protocol}://${req.get('host')}/uploads/${files[key][0].filename}`;
  }
  res.status(200).json({ success: true, urls });
});

export default router;
