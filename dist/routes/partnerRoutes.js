"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const partnerController_1 = require("../controllers/partnerController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
router.get('/', partnerController_1.getPartners);
router.post('/', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), partnerController_1.addPartner);
router.put('/settings', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), partnerController_1.updatePartnerSettings);
router.put('/:id', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), partnerController_1.updatePartner);
router.delete('/:id', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['admin']), partnerController_1.deletePartner);
router.post('/seed', partnerController_1.seedPartners);
exports.default = router;
//# sourceMappingURL=partnerRoutes.js.map