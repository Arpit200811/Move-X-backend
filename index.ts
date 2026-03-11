import "reflect-metadata";
import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from './data-source';

// Route Imports
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import driverRoutes from './routes/driverRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import partnerRoutes from './routes/partnerRoutes';
import notificationRoutes from './routes/notificationRoutes';
import statsRoutes from './routes/statsRoutes';
import paymentRoutes from './routes/paymentRoutes';
import financialRoutes from './routes/financialRoutes'; 
import walletRoutes from './routes/walletRoutes';
import translationRoutes from './routes/translationRoutes';
import systemRoutes from './routes/systemRoutes';
import uploadRoutes from './routes/uploadRoutes';
import groupOrderRoutes from './routes/groupOrderRoutes';
import vendorRoutes from './routes/vendorRoutes';
import marketingRoutes from './routes/marketingRoutes';
import ticketRoutes from './routes/ticketRoutes';
import zoneRoutes from './routes/zoneRoutes';
import { checkServiceability } from './controllers/zoneController';
import auditRoutes from './routes/auditRoutes';
import bannerRoutes from './routes/bannerRoutes';
import refundRoutes from './routes/refundRoutes';
import fleetRoutes from './routes/fleetRoutes';
import catalogRoutes from './routes/catalogRoutes';
import surgeRoutes from './routes/surgeRoutes';
import advancedPartnerRoutes from './routes/advancedPartnerRoutes';

// Service Imports
import { DispatcherService } from './services/dispatcherService';

dotenv.config({ path: '.env' });

const app: Express = express();

// ── Request ID Tracing ──────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).id = uuidv4();
  res.setHeader('X-Mission-ID', (req as any).id);
  next();
});

// ── Core Middleware ──────────────────────────────────────────────────
app.use(cors({ 
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan(':method :url :status - :response-time ms'));
app.use('/uploads', express.static('uploads'));

// ── Rate Limiters ────────────────────────────────────────────────────
// Global API Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased for testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded. Try again later.' }
});

// Stricter Limiter for Auth Routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, // Increased from 10 to 100 for testing
    message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/driver-apply', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);

// ── HTTPS Enforcement (Production) ──────────────────────────────────
if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(['https://', req.get('Host'), req.url].join(''));
        }
        next();
    });
}

// ── HTTP + Socket.IO Server ──────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }
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
    }).catch((err: any) => console.error('[REDIS ADAPTER] Error: ', err.message));
}

// ── Inject io + app instrumentation ─────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).io = io;
  next();
});

// ── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'Operational',
    uptime: `${Math.floor(process.uptime())}s`,
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// High-Priority Serviceability Check (Root Level)
app.get('/api/serviceable-check', checkServiceability);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'MoveX API Server is running (TypeScript Edition)' });
});

// ── ONE-TIME SEED ENDPOINT (Run once to create admin/partner, then remove) ──
app.get('/api/seed-now', async (req: Request, res: Response) => {
  try {
    const bcrypt = require('bcryptjs');
    const { User } = require('./models/User');
    const { Partner } = require('./models/Partner');
    const userRepo = AppDataSource.getRepository(User);
    const partnerRepo = AppDataSource.getRepository(Partner);
    
    const results: string[] = [];

    // 1. FORCE CLEAN & CREATE ADMIN
    const adminPhone = '9999999999';
    // Delete any existing (just in case there's a corruption)
    await userRepo.delete({ phone: adminPhone });
    
    const admin = userRepo.create({
      phone: adminPhone,
      name: 'System Admin',
      role: 'admin',
      passwordHash: await bcrypt.hash('demo123', 10),
      status: 'active',
      isOnline: true,
      phoneVerified: true,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
    });
    await userRepo.save(admin);
    results.push('🚀 SUPER SEED: Admin FORCE CREATED: 9999999999 / demo123');

    // 2. FORCE CLEAN & CREATE PARTNER
    const partnerPhone = '6386373577';
    await userRepo.delete({ phone: partnerPhone });
    
    const partnerUser = userRepo.create({
      phone: partnerPhone,
      name: 'Admin Partner',
      role: 'partner',
      passwordHash: await bcrypt.hash('partner123', 10),
      status: 'active',
      isOnline: true,
      phoneVerified: true,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Partner'
    });
    await userRepo.save(partnerUser);

    // Create partner profile
    await partnerRepo.delete({ name: 'MoveX HQ Store' });
    const partner = partnerRepo.create({
      name: 'MoveX HQ Store',
      category: 'Restaurant',
      email: 'partner@movex.com',
      status: 'Active',
      owner: partnerUser,
      autoAccept: true,
      isAcceptingOrders: true,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'
    });
    await partnerRepo.save(partner);
    results.push('🚀 SUPER SEED: Partner FORCE CREATED: 6386373577 / partner123');

    res.json({ success: true, message: 'Clean Seed Completed!', results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/zones', zoneRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/group-orders', groupOrderRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/finance', financialRoutes); 
app.use('/api/wallet', walletRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/surge', surgeRoutes);
app.use('/api', deliveryRoutes);
app.use('/api/partner-hub', advancedPartnerRoutes);

// ── Global Error Handler ─────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.'
  });
});

// ── Socket.IO Events ──────────────────────────────────────────────────
io.on('connection', (socket: any) => {
  console.log('User connected:', socket.id);

  socket.on('join_order', (orderId: string) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined order room: ${orderId}`);
  });

  socket.on('join_group_room', (groupId: string) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group room: group_${groupId}`);
  });

  socket.on('send_message', (data: { orderId: string, text: string, sender: string }) => {
    console.log(`Message from ${data.sender} in room ${data.orderId}: ${data.text}`);
    // Broadcast to everyone in the room except the sender
    socket.to(data.orderId).emit('new_message', {
        id: uuidv4(),
        text: data.text,
        sender: 'other', 
        timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ── DB + Server Bootstrap ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

AppDataSource.initialize()
  .then(() => {
    console.log('PostgreSQL Connected Successfully ✅');
    server.listen(PORT, () => {
      console.log(`TypeScript Server running on port ${PORT} 🚀`);

      // AI Dispatcher Heartbeat — pulse every 10s
      setInterval(() => {
        DispatcherService.processQueuedMissions(io);
      }, 10000);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[CRITICAL] Port ${PORT} already in use. Terminating.`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
