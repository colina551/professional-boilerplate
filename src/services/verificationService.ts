import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import { EmailService } from './emailService';
import { BadRequestError, ConflictError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('VerificationService');
const userRepository = AppDataSource.getRepository(User);

const BCRYPT_ROUNDS = 12;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const MIN_PASSWORD_LENGTH = 8;

const GENERIC_RESEND_MSG =
  'If an unverified account with that email exists, a verification email has been sent.';
const GENERIC_RESET_MSG =
  'If an account with that email exists, a reset link has been sent.';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  age?: number;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizeToken = (token: string): string => token.trim();

const generateTokenPair = (): { rawToken: string; hashedToken: string } => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const validatePassword = (password: string): void => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }
};

export class VerificationService {
  /**
   * Register new user and send verification email
   */
  static async register(
    input: RegisterInput
  ): Promise<{ message: string; userId: number }> {
    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    const { password, age } = input;

    if (!name) {
      throw new BadRequestError('Name is required');
    }
    validatePassword(password);

    const existing = await userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rawToken, hashedToken } = generateTokenPair();
    const verificationTokenExpiry = new Date(Date.now() + VERIFICATION_TTL_MS);

    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
      age,
      isVerified: false,
      verificationToken: hashedToken,
      verificationTokenExpiry,
    });

    try {
      await userRepository.save(user);
    } catch (error: any) {
      // Handle unique constraint race condition cleanly
      if (error?.code === '23505' || error?.errno === 1062) {
        throw new ConflictError('Email already registered');
      }
      throw error;
    }

    try {
      await EmailService.sendVerificationEmail(email, rawToken);
      logger.info('Verification email sent', { email, userId: user.id });
    } catch (error) {
      logger.error('Failed to send verification email', { email, userId: user.id, error });
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<{ message: string }> {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
      throw new BadRequestError('Invalid verification token');
    }

    const hashedToken = hashToken(normalizedToken);
    const user = await userRepository.findOne({
      where: { verificationToken: hashedToken },
    });

    if (!user) {
      throw new BadRequestError('Invalid verification token');
    }

    if (user.isVerified) {
      throw new BadRequestError('Email already verified');
    }

    if (!user.verificationTokenExpiry || user.verificationTokenExpiry <= new Date()) {
      user.verificationToken = null;
      user.verificationTokenExpiry = null;
      await userRepository.save(user);
      throw new BadRequestError(
        'Verification token has expired. Please request a new one.'
      );
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;

    await userRepository.save(user);

    logger.info('Email verified successfully', { userId: user.id, email: user.email });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  /**
   * Resend verification email
   */
  static async resendVerification(emailInput: string): Promise<{ message: string }> {
    const email = normalizeEmail(emailInput);
    const user = await userRepository.findOne({ where: { email } });

    if (!user || user.isVerified) {
      return { message: GENERIC_RESEND_MSG };
    }

    const { rawToken, hashedToken } = generateTokenPair();
    user.verificationToken = hashedToken;
    user.verificationTokenExpiry = new Date(Date.now() + VERIFICATION_TTL_MS);

    await userRepository.save(user);

    try {
      await EmailService.sendVerificationEmail(email, rawToken);
      logger.info('Verification email resent', { email, userId: user.id });
    } catch (error) {
      logger.error('Failed to resend verification email', { email, userId: user.id, error });
    }

    return { message: GENERIC_RESEND_MSG };
  }

  /**
   * Request password reset
   */
  static async forgotPassword(emailInput: string): Promise<{ message: string }> {
    const email = normalizeEmail(emailInput);
    const user = await userRepository.findOne({ where: { email } });

    if (!user || !user.isVerified) {
      logger.warn('Password reset skipped for missing or unverified account', { email });
      return { message: GENERIC_RESET_MSG };
    }

    const { rawToken, hashedToken } = generateTokenPair();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = new Date(Date.now() + RESET_TTL_MS);

    await userRepository.save(user);

    try {
      await EmailService.sendPasswordResetEmail(email, rawToken);
      logger.info('Password reset email sent', { email, userId: user.id });
    } catch (error) {
      logger.error('Failed to send password reset email', { email, userId: user.id, error });
    }

    return { message: GENERIC_RESET_MSG };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
      throw new BadRequestError('Invalid reset token');
    }

    validatePassword(newPassword);

    const hashedToken = hashToken(normalizedToken);
    const user = await userRepository.findOne({
      where: { resetPasswordToken: hashedToken },
    });

    if (!user) {
      throw new BadRequestError('Invalid reset token');
    }

    if (!user.resetPasswordExpiry || user.resetPasswordExpiry <= new Date()) {
      user.resetPasswordToken = null;
      user.resetPasswordExpiry = null;
      await userRepository.save(user);
      throw new BadRequestError(
        'Reset token has expired. Please request a new one.'
      );
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;

    await userRepository.save(user);

    logger.info('Password reset successfully', { userId: user.id, email: user.email });

    return {
      message:
        'Password reset successfully. You can now log in with your new password.',
    };
  }
}