import type { PermissionFlags } from './types';

export const hasPermission = (
    permissionFlags: PermissionFlags,
    scope: 'organization' | 'project',
    permission: keyof (PermissionFlags['organization'] | PermissionFlags['project'])
): boolean => {
    if (scope === 'organization') {
        return permissionFlags.organization[permission as keyof PermissionFlags['organization']] || permissionFlags.organization.admin;
    }
    return permissionFlags.project[permission as keyof PermissionFlags['project']];
};

export const checkRolePermission = async (
    rolePermissions: PermissionFlags,
    requiredScope: 'organization' | 'project',
    requiredPermission: 'editRoles' | 'editMembers'
): Promise<boolean> => {
    try {
        // If user has admin permission in organization scope, they can do anything
        if (rolePermissions.organization.admin) {
            return true;
        }

        // Check specific permission
        return hasPermission(rolePermissions, requiredScope, requiredPermission);
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
};
