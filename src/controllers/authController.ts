import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export class AuthController {
    static async login(req: Request, res: Response): Promise<void> {
        const result = await AuthService.login(req.body);
        sendSuccess(res, result, 'Login successful');
    }

    static async getMe(req: Request, res: Response): Promise<void> {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.slice('Bearer '.length);

        if (!token) {
            throw new UnauthorizedError('No token provided');
        }

        const user = await AuthService.getUserFromToken(token);
        sendSuccess(res, user);
    }
}
