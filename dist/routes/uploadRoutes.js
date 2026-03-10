"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../config/multer");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
// Single file upload - used by KYC, Proof of Delivery, Avatar
router.post('/', authMiddleware_1.auth, multer_1.upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file received in the request' });
    }
    // Build the absolute accessible URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, url: fileUrl, filename: req.file.filename });
});
// Public upload for registration (No auth required)
router.post('/public', multer_1.upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file received in the request' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, url: fileUrl, filename: req.file.filename });
});
// Multiple files upload (e.g. both License + ID in one call)
router.post('/multi', authMiddleware_1.auth, multer_1.upload.fields([{ name: 'license', maxCount: 1 }, { name: 'idCard', maxCount: 1 }]), (req, res) => {
    const files = req.files;
    if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({ success: false, message: 'No files received' });
    }
    const urls = {};
    for (const key of Object.keys(files)) {
        urls[key] = `${req.protocol}://${req.get('host')}/uploads/${files[key][0].filename}`;
    }
    res.status(200).json({ success: true, urls });
});
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map