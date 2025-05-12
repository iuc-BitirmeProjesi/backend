import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { payloadType, UserLogin } from './types';
import { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { users } from '../../db/schema';
import { and, eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'honoiscool';
const JWT_EXPIRATION = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

export const loginUser = async (
    db: LibSQLDatabase,
    credentials: UserLogin
): Promise<{ token: string } | { error: string; status: number }> => {
    try {
        const { email, password } = credentials;

        if (!email || !password) {
            return { error: 'Email and password are required', status: 400 };
        }

        const user = await db.select().from(users).where(eq(users.email, email)).get();
        if (!user) {
            return { error: 'User not found', status: 401 };
        }

        if (!user.isActiveUser) {
            return { error: 'User is not active', status: 401 };
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return { error: 'Invalid credentials', status: 401 };
        }

        const payload: payloadType = {
            userId: user.id,
            email: user.email,
            exp: JWT_EXPIRATION,
        };

        const token = await sign(payload, JWT_SECRET);

        return { token };
    } catch (err) {
        console.error('Error during login:', err);
        return { error: 'Internal server error', status: 500 };
    }
};
