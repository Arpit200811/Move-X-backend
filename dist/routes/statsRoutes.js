"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const statsController_1 = require("../controllers/statsController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.get('/dashboard', authMiddleware_1.auth, statsController_1.getDashboardStats);
router.get('/heatmap', authMiddleware_1.auth, statsController_1.getHeatmap);
exports.default = router;
//# sourceMappingURL=statsRoutes.js.map