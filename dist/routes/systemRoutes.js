"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const systemController_1 = require("../controllers/systemController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.get('/status', authMiddleware_1.auth, systemController_1.getSystemStatus);
router.get('/stats', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), systemController_1.getSystemStats);
router.get('/logs', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), systemController_1.getSystemLogs);
router.post('/toggle-maintenance', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), systemController_1.toggleMaintenance);
exports.default = router;
//# sourceMappingURL=systemRoutes.js.map