import type { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { organizations, organization_relations, roles } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { PermissionFlags } from '../roles/types';

// Helper function to get user's organization permissions
const getOrganizationPermissions = async (
    db: LibSQLDatabase,
    userId: number,
    organizationId: number
): Promise<PermissionFlags | null> => {
    try {
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
        console.error('Error getting organization permissions:', error);
        return null;
    }
};

// Helper function to check if user can modify organization
const canModifyOrganization = (permissions: PermissionFlags): boolean => {
    return permissions.organization.admin || permissions.organization.editOrganization;
};

// Helper function to check if user can delete organization
const canDeleteOrganization = (permissions: PermissionFlags): boolean => {
    return permissions.organization.admin || permissions.organization.deleteOrganization;
};

// Get all organizations
export const getUsersOrganizations = async (
    db: LibSQLDatabase,
    userId: number
) => {
    try {
        const result = await db
            .select()
            .from(organizations)
            .innerJoin(
                organization_relations,
                eq(organizations.id, organization_relations.organizationId)
            )
            .where(eq(organization_relations.userId, userId))
            .orderBy(desc(organizations.createdAt))
            .all();

        return { data: result, success: true };
    } catch (error) {
        console.error('Error getting organizations:', error);
        return { error: 'Failed to retrieve organizations', success: false };
    }
};

// Get organization by id
export const getOrganizationById = async (
    db: LibSQLDatabase,
    userId: number,
    id: number
) => {
    try {
        const result = await db
            .select()
            .from(organizations)
            .where(
                and(
                    eq(organizations.id, id),
                    eq(organization_relations.userId, userId)
                )
            )
            .innerJoin(
                organization_relations,
                eq(organizations.id, organization_relations.organizationId)
            )
            .get();

        if (!result) throw new Error('Organization not found');

        // No need to check permissions for viewing, as the user is already related to the organization
        return { data: result, success: true };
    } catch (error) {
        console.error(`Error getting organization id ${id}:`, error);
        return { error: 'Failed to retrieve organization', success: false };
    }
};

// Create organization
export const createOrganization = async (
    db: LibSQLDatabase,
    organizationData: typeof organizations.$inferInsert,
    userId: number
) => {
    try {
        // For creating an organization, we don't need to check permissions
        // as any authenticated user can create an organization
        // They will automatically get admin role for the new organization

        // Start a transaction
        const result = await db.transaction(async (tx) => {
            // Insert the organization
            const result = await tx
                .insert(organizations)
                .values({
                    name: organizationData.name,
                    ownerId: userId,
                    logo: organizationData.logo,
                    description: organizationData.description,
                    isActiveOrg:
                        organizationData.isActiveOrg !== undefined
                            ? organizationData.isActiveOrg
                            : true,
                })
                .returning()
                .get();

            // Get the admin role (assuming role id 1 is admin as per the comment in route.ts)
            const adminRoleId = 1;
            await tx.insert(organization_relations).values({
                userId: userId,
                organizationId: result.id,
                roleId: adminRoleId,
            });

            return { data: result, success: true };
        });

        if (!result.success) throw new Error('Failed to create organization');
        return { data: result.data, success: true };
    } catch (error) {
        console.error('Error creating organization:', error);
        return { error: 'Failed to create organization', success: false };
    }
};

// Update organization
export const updateOrganization = async (
    db: LibSQLDatabase,
    id: number,
    userId: number,
    organizationData: Partial<typeof organizations.$inferInsert>
) => {
    try {
        // Check permissions first
        const permissions = await getOrganizationPermissions(db, userId, id);
        if (!permissions) {
            return { error: 'User has no permissions for this organization', success: false };
        }

        if (!canModifyOrganization(permissions)) {
            return { error: 'User does not have permission to update organization', success: false };
        }

        // Check if organization exists
        const orgExists = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(
                and(
                    eq(organizations.id, id),
                    eq(organization_relations.userId, userId)
                )
            )
            .innerJoin(
                organization_relations,
                eq(organizations.id, organization_relations.organizationId)
            )
            .get();

        if (!orgExists) throw new Error('Organization not found');

        const result = await db
            .update(organizations)
            .set({
                name: organizationData.name,
                logo: organizationData.logo,
                description: organizationData.description,
                isActiveOrg: organizationData.isActiveOrg,
                updatedAt: Math.floor(Date.now() / 1000),
            })
            .where(eq(organizations.id, id))
            .returning()
            .get();

        return { data: result, success: true };
    } catch (error) {
        console.error(`Error updating organization id ${id}:`, error);
        return { error: 'Failed to update organization', success: false };
    }
};

// Delete organization
export const deleteOrganization = async (
    db: LibSQLDatabase,
    id: number,
    userId: number
) => {
    try {
        // Check permissions first
        const permissions = await getOrganizationPermissions(db, userId, id);
        if (!permissions) {
            return { error: 'User has no permissions for this organization', success: false };
        }

        if (!canDeleteOrganization(permissions)) {
            return { error: 'User does not have permission to delete organization', success: false };
        }

        // Check if organization exists
        const orgExists = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(
                and(
                    eq(organizations.id, id),
                    eq(organization_relations.userId, userId)
                )
            )
            .innerJoin(
                organization_relations,
                eq(organizations.id, organization_relations.organizationId)
            )
            .get();

        if (!orgExists) throw new Error('Organization not found');

        // Start a transaction
        const result = await db.transaction(async (tx) => {
            // Delete related organization_relations first
            await tx
                .delete(organization_relations)
                .where(eq(organization_relations.organizationId, id));
            // Delete the organization
            const result = await tx
                .delete(organizations)
                .where(eq(organizations.id, id))
                .returning()
                .get();

            return { data: result, success: true };
        });
        if (!result.success) throw new Error('Failed to delete organization');
        return { data: result.data, success: true };
    } catch (error) {
        console.error(`Error deleting organization id ${id}:`, error);
        return { error: 'Failed to delete organization', success: false };
    }
};
