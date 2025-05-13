import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { users } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type User = {
    id?: number;
    email: string;
    createdAt?: Date;
    updatedAt?: Date;
}

//get user info by id
export const getUserInfo = async (
    db: LibSQLDatabase,
    id: number
) => {
    try {
        const result = await db
            .select({
                id: users.id,
                email: users.email,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt
            })
            .from(users)
            .where(eq(users.id, id))
            .get();
        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting user info:', error);
        return { error: 'Failed to retrieve user info', success: false };
    }
}

//update user info by id
export const updateUserInfo = async (
    db: LibSQLDatabase,
    id: number,
    body: User
) => {
    try {
        const result = await db
            .update(users)
            .set({
                email: body.email,
                updatedAt: Math.floor(Date.now() / 1000), // Assuming updatedAt is a timestamp in seconds
            })
            .where(eq(users.id, id))
            .returning()
            .get();
        return { data: result, success: true };
    } catch (error) {
        console.error('Error updating user info:', error);
        return { error: 'Failed to update user info', success: false };
    }
}

//toggle user active status
export const toggleUserStatus = async (
    db: LibSQLDatabase,
    id: number
) => {
    try {
        const user = await db
            .select({ isActiveUser: users.isActiveUser })
            .from(users)
            .where(eq(users.id, id))
            .get();

        if (!user) {
            return { error: 'User not found', success: false };
        }

        const result = await db
            .update(users)
            .set({
                isActiveUser: !user.isActiveUser,
                updatedAt: Math.floor(Date.now() / 1000),
            })
            .where(eq(users.id, id))
            .returning()
            .get();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error toggling user status:', error);
        return { error: 'Failed to toggle user status', success: false };
    }
}