import express from 'express';
import { config } from './config/config';
import { securityHeaders, corsMiddleware, rateLimiter } from './middleware/security.middleware';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';
import paymentPageRoute from './routes/payment-page.route';
import paymentQueryRoute from './routes/payment-query.route';
import adminRoute from './routes/admin.route';
import logger from './utils/logger';

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', paymentPageRoute);
app.use('/', paymentQueryRoute);
app.use('/admin', adminRoute);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    nodeEnv: config.nodeEnv,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;

