"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleGuard = exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No mission credentials provided.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        // Maintenance Guard (Simplified for TS migration, can be wired to system controller later)
        // For now, allow all to bypass during the phase shift
        next();
    }
    catch (err) {
        res.status(401).json({ success: false, message: 'Encryption breach: Token invalid.' });
    }
};
exports.auth = auth;
const roleGuard = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Neural handshake failed: Unauthenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Clearance Denied: ${req.user.role.toUpperCase()} role lacks protocol authorization.`
            });
        }
        next();
    };
};
exports.roleGuard = roleGuard;
//# sourceMappingURL=authMiddleware.js.map