import express from 'express';
import { 
    getFinancialSummary, 
    getFinancialTrends, 
    getPayoutRequests, 
    processPayout, 
    getLedger, 
    exportAuditReport 
} from '../controllers/financialController';
import { auth, roleGuard } from '../config/authMiddleware';

const router = express.Router();

// FINANCIAL VAUT PROTECTED - ADMIN ONLY
router.use(auth as any);
router.use(roleGuard(['admin']));

router.get('/summary', getFinancialSummary);
router.get('/trends', getFinancialTrends);
router.get('/payouts', getPayoutRequests);
router.post('/payouts/process', processPayout);
router.get('/ledger', getLedger);
router.get('/export-csv', exportAuditReport);

export default router;
