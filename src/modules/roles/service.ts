import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { roles, organizations, organization_relations } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { checkRolePermission } from './utils';
import type { PermissionFlags } from './types';

// Helper function to get user's role permissions
const getUserRolePermissions = async (
    db: LibSQLDatabase,
    userId: number,
    organizationId: number | undefined
): Promise<PermissionFlags | null> => {
    try {
        if (!organizationId) {
            return null;
        }

        const userRole = await db
            .select({
                permissionFlags: roles.permissionFlags,
            })
            .from(organization_relations)
            .innerJoin(roles, eq(organization_relations.roleId, roles.id))
            .where(
                and(
                    eq(organization_relations.userId, userId),
                    eq(organization_relations.organizationId, organizationId)
                )
            )
            .get();

        return userRole ? userRole.permissionFlags as PermissionFlags : null;
    } catch (error) {
        console.error('Error getting user role permissions:', error);
        return null;
    }
};

//get all roles
export const getRoles = async (
    db: LibSQLDatabase,
    userId: number,
    organizationId: number
) => {
    try {
        const userPermissions = await getUserRolePermissions(db, userId, organizationId);
        if (!userPermissions) {
            return { error: 'User has no permissions', success: false };
        }

        // Check if user has permission to view roles
        const hasAccess = await checkRolePermission(userPermissions, 'organization', 'editRoles');
        if (!hasAccess) {
            return { error: 'User does not have permission to view roles', success: false };
        }

        const result = await db
            .select({
                id: roles.id,
                name: roles.name,
                description: roles.description,
                scope: roles.scope,
                organizationId: organizations.id,
                organizationName: organizations.name,
                permissionFlags: roles.permissionFlags,
                createdAt: roles.createdAt,
                updatedAt: roles.updatedAt,
            })
            .from(roles)
            .innerJoin(
                organizations,
                eq(roles.organizationId, organizations.id)
            )
            .where(eq(roles.organizationId, organizationId))
            .orderBy(desc(roles.createdAt))
            .all();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting roles:', error);
        return { error: 'Failed to retrieve roles', success: false };
    }
};

//get role by id
export const getRoleById = async (
    db: LibSQLDatabase,
    id: number,
    userId: number,
    organizationId: number
) => {
    try {
        const userPermissions = await getUserRolePermissions(db, userId, organizationId);
        if (!userPermissions) {
            return { error: 'User has no permissions', success: false };
        }

        // Check if user has permission to view roles
        const hasAccess = await checkRolePermission(userPermissions, 'organization', 'editRoles');
        if (!hasAccess) {
            return { error: 'User does not have permission to view roles', success: false };
        }

        const result = await db
            .select()
            .from(roles)
            .where(eq(roles.id, id))
            .innerJoin(
                organizations,
                eq(roles.organizationId, organizations.id)
            )
            .all();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting role by id:', error);
        return { error: 'Failed to retrieve role', success: false };
    }
};

//create role 
export const createRole = async (
    db: LibSQLDatabase,
    roleData: typeof roles.$inferInsert,
    userId: number
) => {
    try {
        if (!roleData.organizationId) {
            return { error: 'Organization ID is required', success: false };
        }

        const userPermissions = await getUserRolePermissions(db, userId, roleData.organizationId);
        if (!userPermissions) {
            return { error: 'User has no permissions', success: false };
        }

        // Check if user has permission to create roles
        const hasAccess = await checkRolePermission(userPermissions, 'organization', 'editRoles');
        if (!hasAccess) {
            return { error: 'User does not have permission to create roles', success: false };
        }

        const result = await db
            .insert(roles)
            .values(roleData)
            .returning()
            .all();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error creating role:', error);
        return { error: 'Failed to create role', success: false };
    }
};

//update role
export const updateRole = async (
    db: LibSQLDatabase,
    roleData: typeof roles.$inferInsert,
    id: number,
    userId: number
) => {
    try {
        if (!roleData.organizationId) {
            return { error: 'Organization ID is required', success: false };
        }

        const userPermissions = await getUserRolePermissions(db, userId, roleData.organizationId);
        if (!userPermissions) {
            return { error: 'User has no permissions', success: false };
        }

        // Check if user has permission to update roles
        const hasAccess = await checkRolePermission(userPermissions, 'organization', 'editRoles');
        if (!hasAccess) {
            return { error: 'User does not have permission to update roles', success: false };
        }

        const result = await db
            .update(roles)
            .set(roleData)
            .where(eq(roles.id, id))
            .returning()
            .all();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error updating role:', error);
        return { error: 'Failed to update role', success: false };
    }
};

//delete role 
export const deleteRole = async (
    db: LibSQLDatabase,
    id: number,
    userId: number,
    organizationId: number
) => {
    try {
        const userPermissions = await getUserRolePermissions(db, userId, organizationId);
        if (!userPermissions) {
            return { error: 'User has no permissions', success: false };
        }

        // Check if user has permission to delete roles
        const hasAccess = await checkRolePermission(userPermissions, 'organization', 'editRoles');
        if (!hasAccess) {
            return { error: 'User does not have permission to delete roles', success: false };
        }

        const result = await db
            .delete(roles)
            .where(eq(roles.id, id))
            .returning()
            .all();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error deleting role:', error);
        return { error: 'Failed to delete role', success: false };
    }
};