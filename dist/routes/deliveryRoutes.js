"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../config/authMiddleware");
const multer_1 = require("../config/multer");
const router = express_1.default.Router();
router.post('/assign-driver', authMiddleware_1.auth, orderController_1.adminAssignDriver);
router.post('/complete', authMiddleware_1.auth, multer_1.upload.single('evidence'), (req, res) => {
    // Shim for mobile apps: map POST body to PUT logic
    const { orderId, otp } = req.body;
    req.params = { id: orderId }; // controller expects id in params
    req.body = {
        id: orderId, // also some logic checks body.id
        status: 'DELIVERED',
        otp,
        deliveryPhoto: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : undefined
    };
    return (0, orderController_1.updateOrderStatus)(req, res);
});
exports.default = router;
//# sourceMappingURL=deliveryRoutes.js.map