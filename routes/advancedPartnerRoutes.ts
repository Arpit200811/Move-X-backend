import express from 'express';
import { auth, roleGuard } from '../config/authMiddleware';
import {
    setOrderPrepTime,
    updateMenuSchedule,
    updateStock,
    getLowStockAlerts,
    updateSurgePricing,
    generateGSTInvoice,
    updateGSTSettings,
    getStaffAccounts,
    addStaffAccount,
    removeStaffAccount,
    getCancellationAnalytics,
    getBoostStatus,
    activateBoost,
    getRefundRequests,
    respondToRefund
} from '../controllers/advancedPartnerController';

const router = express.Router();
const guard = roleGuard(['partner', 'admin']);

// 1. Order Prep Timer
router.put('/orders/:orderId/prep-time', auth as any, guard, setOrderPrepTime);

// 2. Menu Scheduling
router.put('/products/:productId/schedule', auth as any, guard, updateMenuSchedule);

// 3. Stock & Inventory
router.put('/products/:productId/stock', auth as any, guard, updateStock);
router.get('/low-stock-alerts', auth as any, guard, getLowStockAlerts);

// 4. Surge Pricing
router.put('/surge-pricing', auth as any, guard, updateSurgePricing);

// 5. GST Settings & Invoice
router.put('/gst-settings', auth as any, guard, updateGSTSettings);
router.get('/orders/:orderId/invoice', auth as any, guard, generateGSTInvoice);

// 6. Staff Accounts
router.get('/staff', auth as any, guard, getStaffAccounts);
router.post('/staff', auth as any, guard, addStaffAccount);
router.delete('/staff/:staffId', auth as any, guard, removeStaffAccount);

// 7. Cancellation Analytics
router.get('/cancellation-analytics', auth as any, guard, getCancellationAnalytics);

// 8. Boost / Sponsored Listing
router.get('/boost', auth as any, guard, getBoostStatus);
router.post('/boost', auth as any, guard, activateBoost);

// 9. Refund Management
router.get('/refunds', auth as any, guard, getRefundRequests);
router.put('/refunds/:orderId', auth as any, guard, respondToRefund);

export default router;
