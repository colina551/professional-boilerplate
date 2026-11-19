import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated, createPaginationMeta } from '../utils/response';
import { createLogger } from '../utils/logger';
import { idParamSchema, paginationQuerySchema } from '../dto/user.dto';
import { ValidationError } from '../utils/errors';

const logger = createLogger('UserController');

export class UserController {
    static async getAll(req: Request, res: Response): Promise<void> {
        const { value, error } = paginationQuerySchema.validate(req.query, {
            abortEarly: false,
            convert: true,
            stripUnknown: true,
        });

        if (error) {
            throw new ValidationError(error.message);
        }

        const { page, limit, sort, order } = value;
        const [users, total] = await UserService.findAll({
            page,
            limit,
            sort,
            order,
        });

        const meta = createPaginationMeta(total, page, limit);
        logger.info('Users retrieved', { count: total, page, limit });
        sendPaginated(res, users, meta);
    }

    static async getById(req: Request, res: Response): Promise<void> {
        const id = UserController.getValidatedId(req);
        const user = await UserService.findById(id);

        logger.info('User retrieved', { userId: id });
        sendSuccess(res, user);
    }

    static async create(req: Request, res: Response): Promise<void> {
        const user = await UserService.create(req.body);

        logger.info('User created', { userId: user.id, email: user.email });
        sendCreated(res, user, 'User created successfully');
    }

    static async update(req: Request, res: Response): Promise<void> {
        const id = UserController.getValidatedId(req);
        const user = await UserService.update(id, req.body);

        logger.info('User updated', { userId: id });
        sendSuccess(res, user, 'User updated successfully');
    }

    static async delete(req: Request, res: Response): Promise<void> {
        const id = UserController.getValidatedId(req);
        await UserService.delete(id);

        logger.info('User deleted', { userId: id });
        sendNoContent(res);
    }

    private static getValidatedId(req: Request): number {
        const { value, error } = idParamSchema.validate(req.params, {
            abortEarly: false,
            convert: true,
        });

        if (error) {
            throw new ValidationError(error.message);
        }

        return value.id;
    }
}
