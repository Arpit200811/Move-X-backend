"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const uuid_1 = require("uuid");
const data_source_1 = require("./data-source");
// Route Imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
const deliveryRoutes_1 = __importDefault(require("./routes/deliveryRoutes"));
const partnerRoutes_1 = __importDefault(require("./routes/partnerRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const financialRoutes_1 = __importDefault(require("./routes/financialRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const translationRoutes_1 = __importDefault(require("./routes/translationRoutes"));
const systemRoutes_1 = __importDefault(require("./routes/systemRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const groupOrderRoutes_1 = __importDefault(require("./routes/groupOrderRoutes"));
const vendorRoutes_1 = __importDefault(require("./routes/vendorRoutes"));
const marketingRoutes_1 = __importDefault(require("./routes/marketingRoutes"));
// Service Imports
const dispatcherService_1 = require("./services/dispatcherService");
dotenv.config({ path: '.env' });
const app = (0, express_1.default)();
// ── Request ID Tracing ──────────────────────────────────────────────
app.use((req, res, next) => {
    req.id = (0, uuid_1.v4)();
    res.setHeader('X-Mission-ID', req.id);
    next();
});
// ── Core Middleware ──────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use((0, cors_1.default)({ origin: allowedOrigins }));
app.use(express_1.default.json());
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(':method :url :status - :response-time ms'));
app.use('/uploads', express_1.default.static('uploads'));
// ── Rate Limiters ────────────────────────────────────────────────────
// Global API Limiter
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Rate limit exceeded. Try again later.' }
});
// Stricter Limiter for Auth Routes (Prevention of Brute Force)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts
    message: { success: false, message: 'Too many login attempts. Please try again after an hour.' }
});
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/driver-apply', authLimiter);
// ── HTTPS Enforcement (Production) ──────────────────────────────────
if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(['https://', req.get('Host'), req.url].join(''));
        }
        next();
    });
}
// ── HTTP + Socket.IO Server ──────────────────────────────────────────
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }
});
// Configure Redis Adapter for Multi-Node Scaling (High Availability)
if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[REDIS ADAPTER] Connected for Socket Scaling');
    }).catch((err) => console.error('[REDIS ADAPTER] Error: ', err.message));
}
// ── Inject io + app instrumentation ─────────────────────────────────────
app.use((req, res, next) => {
    req.io = io;
    next();
});
// ── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'Operational',
        uptime: `${Math.floor(process.uptime())}s`,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});
app.get('/', (req, res) => {
    res.json({ message: 'MoveX API Server is running (TypeScript Edition)' });
});
// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/group-orders', groupOrderRoutes_1.default);
app.use('/api/drivers', driverRoutes_1.default);
app.use('/api', deliveryRoutes_1.default);
app.use('/api/partners', partnerRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/stats', statsRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/finance', financialRoutes_1.default);
app.use('/api/wallet', walletRoutes_1.default);
app.use('/api/translations', translationRoutes_1.default);
app.use('/api/system', systemRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/vendors', vendorRoutes_1.default);
app.use('/api/marketing', marketingRoutes_1.default);
// ── Global Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    if (res.headersSent)
        return next(err);
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.'
    });
});
// ── Socket.IO Events ──────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join_order', (orderId) => {
        socket.join(orderId);
        console.log(`Socket ${socket.id} joined order room: ${orderId}`);
    });
    socket.on('join_group_room', (groupId) => {
        socket.join(`group_${groupId}`);
        console.log(`Socket ${socket.id} joined group room: group_${groupId}`);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// ── DB + Server Bootstrap ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
data_source_1.AppDataSource.initialize()
    .then(() => {
    console.log('PostgreSQL Connected Successfully ✅');
    server.listen(PORT, () => {
        console.log(`TypeScript Server running on port ${PORT} 🚀`);
        // AI Dispatcher Heartbeat — pulse every 10s
        setInterval(() => {
            dispatcherService_1.DispatcherService.processQueuedMissions(io);
        }, 10000);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[CRITICAL] Port ${PORT} already in use. Terminating.`);
            process.exit(1);
        }
        else {
            throw err;
        }
    });
})
    .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map