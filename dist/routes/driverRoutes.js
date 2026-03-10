"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const driverController_1 = require("../controllers/driverController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), driverController_1.getDrivers);
router.get('/stats', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver']), driverController_1.getDriverStats);
router.get('/batches', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver']), driverController_1.getVRPBatches);
router.post('/batch-accept', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver']), driverController_1.acceptVRPBatch);
router.post('/location', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin']), driverController_1.updateLocation);
router.patch('/location', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'admin']), driverController_1.updateLocation);
router.get('/heatmap', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['driver', 'customer', 'admin']), driverController_1.getSurgeHeatmap);
exports.default = router;
//# sourceMappingURL=driverRoutes.js.map