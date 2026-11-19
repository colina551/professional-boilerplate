import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import { NotFoundError, ConflictError } from '../utils/errors';
import bcrypt from 'bcrypt';

const userRepository = AppDataSource.getRepository(User);

type UserResponse = Pick<
    User,
    'id' | 'name' | 'email' | 'isActive' | 'age' | 'createdAt' | 'updatedAt'
>;

interface FindAllOptions {
    page: number;
    limit: number;
    sort: 'createdAt' | 'updatedAt' | 'name' | 'email';
    order: 'ASC' | 'DESC';
}

interface CreateUserData {
    name: string;
    email: string;
    password: string;
    age?: number;
}

interface UpdateUserData {
    name?: string;
    email?: string;
    age?: number;
    isActive?: boolean;
}

const toUserResponse = (user: User): UserResponse => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    age: user.age,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

export class UserService {
    static async findAll(options: FindAllOptions): Promise<[UserResponse[], number]> {
        const { page, limit, sort, order } = options;
        const skip = (page - 1) * limit;

        const [users, count] = await userRepository.findAndCount({
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                age: true,
                createdAt: true,
                updatedAt: true,
            },
            order: { [sort]: order },
            skip,
            take: limit,
        });

        return [users.map(toUserResponse), count];
    }

    static async findById(id: number): Promise<UserResponse> {
        const user = await userRepository.findOne({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                age: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        
        if (!user) {
            throw new NotFoundError('User', id);
        }

        return toUserResponse(user);
    }

    static async create(data: CreateUserData): Promise<UserResponse> {
        const existing = await userRepository.findOne({
            where: { email: data.email },
        });

        if (existing) {
            throw new ConflictError('A user with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = userRepository.create({
            ...data,
            password: hashedPassword,
        });

        const savedUser = await userRepository.save(user);
        return toUserResponse(savedUser);
    }

    static async update(id: number, data: UpdateUserData): Promise<UserResponse> {
        const user = await userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundError('User', id);
        }

        if (data.email !== undefined && data.email !== user.email) {
            const existing = await userRepository.findOne({
                where: { email: data.email },
            });

            if (existing) {
                throw new ConflictError('A user with this email already exists');
            }
        }

        Object.assign(user, data);

        const savedUser = await userRepository.save(user);
        return toUserResponse(savedUser);
    }

    static async delete(id: number): Promise<void> {
        const user = await userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundError('User', id);
        }

        await userRepository.remove(user);
    }
}
