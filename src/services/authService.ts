import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import { UnauthorizedError } from '../utils/errors';
import { config } from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthService');

interface LoginInput {
    email: string;
    password: string;
}

interface TokenPayload {
    userId: number;
    email: string;
}

interface AuthResponse {
    token: string;
    user: {
        id: number;
        email: string;
        name: string;
    };
}

export class AuthService {
    private static getUserRepository() {
        return AppDataSource.getRepository(User);
    }

    /**
     * Login user and generate JWT token
     */
    static async login(input: LoginInput): Promise<AuthResponse> {
        const email = input.email.trim().toLowerCase();
        const { password } = input;
        const userRepository = this.getUserRepository();

        // 1. Find user by email and explicitly include password (even if select: false on entity)
        const user = await userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .getOne();

        if (!user) {
            logger.warn('Login attempt with non-existent email', { email });
            throw new UnauthorizedError('Invalid email or password');
        }

        if (!user.isVerified) {
            logger.warn('Login attempt for unverified account', { email });
            throw new UnauthorizedError(
                'Please verify your email address before logging in. Check your inbox for the verification link.'
            );
        }

        // 2. Check if user is active
        if (!user.isActive) {
            logger.warn('Login attempt for inactive account', { email });
            throw new UnauthorizedError('Account is deactivated');
        }

        // 3. Compare passwords with bcrypt
        if (!user.password) {
            logger.warn('Login attempt for user without password hash', { email });
            throw new UnauthorizedError('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            logger.warn('Login attempt with wrong password', { email });
            throw new UnauthorizedError('Invalid email or password');
        }

        // 4. Generate JWT token
        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
        };

        const signOptions: jwt.SignOptions = {
            expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
            algorithm: 'HS256',
        };

        const token = jwt.sign(tokenPayload, config.jwt.secret, signOptions);

        logger.info('User logged in successfully', { userId: user.id, email: user.email });

        // 5. Return token and user data (without password)
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }

    /**
     * Verify JWT token and return decoded payload
     */
    static async verifyToken(token: string): Promise<TokenPayload> {
        try {
            const decoded = jwt.verify(token, config.jwt.secret, {
                algorithms: ['HS256'],
            });

            if (typeof decoded === 'string' || typeof decoded !== 'object' || decoded === null) {
                throw new UnauthorizedError('Invalid token');
            }

            const payload = decoded as jwt.JwtPayload;

            if (
                typeof payload.userId !== 'number' ||
                !Number.isSafeInteger(payload.userId) ||
                payload.userId <= 0 ||
                typeof payload.email !== 'string'
            ) {
                throw new UnauthorizedError('Invalid token');
            }

            return {
                userId: payload.userId,
                email: payload.email,
            };
        } catch (error: unknown) {
            if (error instanceof UnauthorizedError) {
                throw error;
            }
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Token has expired');
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new UnauthorizedError('Invalid token');
            }
            throw new UnauthorizedError('Authentication failed');
        }
    }

    /**
     * Get user from token (useful for getting full user data)
     */
    static async getUserFromToken(token: string): Promise<User> {
        const decoded = await this.verifyToken(token);
        const userRepository = this.getUserRepository();

        const user = await userRepository.findOne({
            where: { id: decoded.userId },
        });

        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('Account is deactivated');
        }

        return user;
    }
}