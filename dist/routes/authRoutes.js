"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const driverController_1 = require("../controllers/driverController");
const authMiddleware_1 = require("../config/authMiddleware");
const multer_1 = require("../config/multer");
const router = express_1.default.Router();
router.post('/login', authController_1.loginOrSignup);
router.post('/send-otp', authController_1.sendOtp);
router.post('/verify-otp', authController_1.verifyOtp);
router.post('/register', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin', 'customer']), authController_1.registerUser);
router.post('/driver-apply', authController_1.driverApply);
router.post('/partner-apply', authController_1.partnerApply);
router.patch('/drivers/:driverId/approve', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), authController_1.approveDriver);
router.get('/me', authMiddleware_1.auth, authController_1.getMe);
router.get('/users', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), authController_1.getAllUsers);
router.put('/profile', authMiddleware_1.auth, authController_1.updateProfile); // Update name/avatar
router.put('/settings', authMiddleware_1.auth, authController_1.updateSettings); // Save settings to DB
router.post('/avatar', authMiddleware_1.auth, multer_1.upload.single('avatar'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    // We can finalize this in authController if we want to save to DB immediately
    res.status(200).json({ success: true, avatarUrl });
});
router.post('/toggle-online', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver']), authController_1.toggleOnlineStatus); // Online/Offline toggle
router.post('/location', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver']), driverController_1.updateLocation); // Mobile telemetry fix
router.post('/location-batch', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver']), driverController_1.updateLocationBatch); // Offline sync batch
router.post('/push-token', authMiddleware_1.auth, authController_1.savePushToken);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map