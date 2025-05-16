import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import {
    organizationRelations,
    organizationRoles,
    projectRoles,
} from './db/schema';
import { and, eq } from 'drizzle-orm';

export const checkOrganizationPermission = async (
    db: LibSQLDatabase,
    userId: number,
    organizationId: number,
    flag: keyof typeof organizationRoles.$inferSelect.permissionFlags
) => {
    const permissions = await db
        .select({ permissionFlags: organizationRoles.permissionFlags })
        .from(organizationRoles)
        .innerJoin(
            organizationRelations,
            eq(organizationRoles.id, organizationRelations.roleId)
        )
        .where(
            and(
                eq(organizationRelations.userId, userId),
                eq(organizationRelations.organizationId, organizationId)
            )
        )
        .get();

    if (!permissions)
        throw new Error('User has no permissions for this organization');
    if (permissions?.permissionFlags.admin) return true;
    const hasPermission = permissions.permissionFlags[flag] ?? false;
    if (!hasPermission)
        throw new Error(`User does not have permission: ${flag}`);

    return true;
};

