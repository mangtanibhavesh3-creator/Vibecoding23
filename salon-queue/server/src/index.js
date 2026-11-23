import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed/seedData.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';
import bootstrapRoutes from './routes/bootstrapRoutes.js';
import authRoutes from './routes/authRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Parse comma-separated allowed client origins (e.g. "http://localhost:5173,https://my-salon.vercel.app")
const parseAllowedOrigins = () => {
  const rawOrigins = process.env.CLIENT_URL || 'http://localhost:5173';
  const parsed = rawOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Always include local dev port if not present
  if (!parsed.includes('http://localhost:5173')) {
    parsed.push('http://localhost:5173');
  }
  return parsed;
};

const allowedOrigins = parseAllowedOrigins();

// Dynamic CORS Origin Validator
const corsOriginDelegate = (origin, callback) => {
  // Allow requests with no origin (mobile clients, curl, server-to-server health checks)
  if (!origin) return callback(null, true);

  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    return callback(null, true);
  }

  // Allow Vercel preview deployments
  if (origin.endsWith('.vercel.app')) {
    return callback(null, true);
  }

  return callback(new Error(`CORS error: Origin '${origin}' is not authorized`));
};

// Middleware
app.use(
  cors({
    origin: corsOriginDelegate,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
);
app.options('*', cors());
app.use(express.json());

// Socket.IO Setup with Multi-Origin CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOriginDelegate,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to Express app for access in routes
app.set('io', io);

// Setup Socket.IO connection handling & hydration
setupSocketHandlers(io);

// API Routes
app.use('/api/bootstrap', bootstrapRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);

// Comprehensive API Health Check Endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const uptimeSeconds = Math.floor(process.uptime());

  res.status(200).json({
    status: 'ok',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptimeSeconds,
    service: 'Salon Queue Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    allowedOrigins,
    sockets: {
      connectedClients: io.engine.clientsCount,
    },
  });
});

// Bootstrap Database & Launch Server
const startServer = async () => {
  try {
    const conn = await connectDB();
    if (conn) {
      await seedDatabase();
    }
    server.listen(PORT, () => {
      console.log(`[Server] Salon Queue Server running on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Allowed CORS origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (err) {
    console.error(`[Server] Startup failure: ${err.message}`);
    process.exit(1);
  }
};

startServer();

export { app, server, io };
