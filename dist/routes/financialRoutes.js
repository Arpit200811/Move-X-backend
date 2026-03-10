"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const financialController_1 = require("../controllers/financialController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = express_1.default.Router();
// FINANCIAL VAUT PROTECTED - ADMIN ONLY
router.use(authMiddleware_1.auth);
router.use((0, authMiddleware_1.roleGuard)(['admin']));
router.get('/summary', financialController_1.getFinancialSummary);
router.get('/trends', financialController_1.getFinancialTrends);
router.get('/payouts', financialController_1.getPayoutRequests);
router.post('/payouts/process', financialController_1.processPayout);
router.get('/ledger', financialController_1.getLedger);
router.get('/export-csv', financialController_1.exportAuditReport);
exports.default = router;
//# sourceMappingURL=financialRoutes.js.map