"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const groupOrderController_1 = require("../controllers/groupOrderController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.post('/create', authMiddleware_1.auth, groupOrderController_1.createGroupOrder);
router.post('/join', authMiddleware_1.auth, groupOrderController_1.joinGroupOrder);
router.post('/:groupId/items', authMiddleware_1.auth, groupOrderController_1.addItemToGroupCart); // Add item for specific user
exports.default = router;
//# sourceMappingURL=groupOrderRoutes.js.map