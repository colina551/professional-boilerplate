import 'reflect-metadata';
import express from 'express';
import { config } from './config/env';
import { AppDataSource } from './config/data-source';
import { logger } from './utils/logger';
import {
   helmetMiddleware,
   corsMiddleware,
   apiLimiter
} from './middleware/security';
import { requestLoggingMiddleware } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';


// Import routes
import { userRoutes } from './routes/userRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { authRoutes } from './routes/authRoutes';  // ← Add this


const app = express();


app.set('trust proxy', 1);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);
app.use(requestLoggingMiddleware);


// Register routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);  // ← Add this
app.use('/api/users', userRoutes);


app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
    await AppDataSource.initialize();

    app.listen(config.port, () => {
        logger.info(`Server running on port ${config.port}`);
    });
}

start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});

