import express from 'express';
import { 
  loginOrSignup, 
  getMe, 
  getAllUsers, 
  updateUserStatus,
  verifyOtp, 
  sendOtp,
  registerUser, 
  driverApply, 
  approveDriver, 
  updateProfile, 
  updateSettings,
  toggleOnlineStatus, 
  savePushToken,
  partnerApply,
  createUserAdmin
} from '../controllers/authController';
import { updateLocation, updateLocationBatch } from '../controllers/driverController';
import { auth, roleGuard } from '../config/authMiddleware';
import { upload } from '../config/multer';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema, sendOtpSchema, verifyOtpSchema, driverApplySchema, partnerApplySchema, createUserSchema } from '../validators/auth.validators';

const router = express.Router();

router.post('/login', validateRequest(loginSchema), loginOrSignup);
router.post('/send-otp', validateRequest(sendOtpSchema), sendOtp);
router.post('/verify-otp', validateRequest(verifyOtpSchema), verifyOtp);
router.post('/register', auth as any, roleGuard(['admin', 'customer']), registerUser);
router.post('/driver-apply', validateRequest(driverApplySchema), driverApply);
router.post('/partner-apply', validateRequest(partnerApplySchema), partnerApply);
router.patch('/drivers/:driverId/approve', auth as any, roleGuard(['admin']), approveDriver);
router.get('/me', auth as any, getMe);
router.get('/users', auth as any, roleGuard(['admin']), getAllUsers);
router.put('/users/:userId', auth as any, roleGuard(['admin']), updateUserStatus); // Admin: ban/unban, role change
router.put('/profile', auth as any, updateProfile);
router.put('/settings', auth as any, updateSettings);
router.post('/avatar', auth as any, upload.single('avatar'), (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, avatarUrl });
});
router.post('/toggle-online', auth as any, roleGuard(['driver']), toggleOnlineStatus);
router.post('/location', auth as any, roleGuard(['driver']), updateLocation);
router.post('/location-batch', auth as any, roleGuard(['driver']), updateLocationBatch);
router.post('/push-token', auth as any, savePushToken);
router.post('/provision-user', auth as any, roleGuard(['admin']), validateRequest(createUserSchema), createUserAdmin);

export default router;
