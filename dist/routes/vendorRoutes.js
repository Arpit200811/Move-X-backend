"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendorController_1 = require("../controllers/vendorController");
const authMiddleware_1 = require("../config/authMiddleware");
const router = (0, express_1.Router)();
// Zomato and Apollo unified vendors endpoint
router.get('/', authMiddleware_1.auth, vendorController_1.getVendors);
// Partner product management
router.get('/my-products', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), vendorController_1.getMyProducts);
router.post('/products', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), vendorController_1.addProduct);
router.delete('/products/:productId', authMiddleware_1.auth, (0, authMiddleware_1.roleGuard)(['partner', 'admin']), vendorController_1.deleteProduct);
exports.default = router;
//# sourceMappingURL=vendorRoutes.js.map