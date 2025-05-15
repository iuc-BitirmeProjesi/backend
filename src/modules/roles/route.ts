import { Hono } from "hono";
import type { Variables } from '../../types';
import {
    getRoleById,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
} from './service';
import type { roles } from "../../db/schema";
import type { PermissionFlags } from './types';

type RoleRequestBody = {
    name: string;
    orgId: number;
    description?: string;
    scope: 'organization' | 'project';
    permissionFlags?: PermissionFlags;
};

const app = new Hono<{ Variables: Variables }>();


//get all roles
app.get('/all', async (c) => {
    try {
        const db = c.var.db;
        const userId = c.var.jwtPayload.userId;

        // Get orgId from query parameter
        const orgId = c.req.query('orgId');
        if (!orgId) throw new Error('Organization ID is required');

        const result = await getRoles(db, userId, Number(orgId));

        if (!result.success) throw new Error(result.error);

        return c.json({ data: result.data });
    } catch (error) {
        console.error('Error in get roles route:', error);
        return c.json({ error: 'Failed to retrieve roles', details: error.message }, 500);
    }
});

//get role by id
app.get('/:id', async (c) => {
    try {
        const db = c.var.db;
        const id = c.req.param('id');
        
        if (!id) throw new Error('Role ID is required');
        
        const userId = c.var.jwtPayload.userId;

        // Get orgId from query parameter
        const orgId = c.req.query('orgId');
        if (!orgId) throw new Error('Organization ID is required');

        const result = await getRoleById(db, Number(id), userId, Number(orgId));
        if (!result.success) throw new Error(result.error);
        return c.json({ data: result.data });
    } catch (error) {
        console.error('Error in get role by id route:', error);
        return c.json({ error: 'Failed to retrieve role', details: error.message }, 500);
    }
});

//update role
app.put('/:id', async (c) => {
    try {
        const db = c.var.db;
        const id = c.req.param('id');
        
        if (!id) throw new Error('Role ID is required');
        
        const userId = c.var.jwtPayload.userId;

        // Parse the request body
        const body = await c.req.json<RoleRequestBody>();

        // Validate the request body
        if (!body.name) throw new Error('Role name is required');
        if (!body.orgId) throw new Error('Organization ID is required');

        const roleData : typeof roles.$inferInsert = {
            name: body.name,
            description: body.description,
            scope: body.scope,
            organizationId: body.orgId,
            permissionFlags: body.permissionFlags,
        };

        const result = await updateRole(db, roleData, Number(id), userId);
        if (!result.success) throw new Error(result.error);

        return c.json({ data: result.data });
    } catch (error) {
        console.error('Error in update role route:', error);
        return c.json({ error: 'Failed to update role', details: error.message }, 500);
    }
});

//delete role
app.delete('/:id', async (c) => {
    try {
        const db = c.var.db;
        const id = c.req.param('id');
        
        if (!id) throw new Error('Role ID is required');
        
        const userId = c.var.jwtPayload.userId;

        // Get orgId from query parameter
        const orgId = c.req.query('orgId');
        if (!orgId) throw new Error('Organization ID is required');

        const result = await deleteRole(db, Number(id), userId, Number(orgId));
        if (!result.success) throw new Error(result.error);

        return c.json({ data: result.data });
    } catch (error) {
        console.error('Error in delete role route:', error);
        return c.json({ error: 'Failed to delete role', details: error.message }, 500);
    }
});

//create role
app.post('/create', async (c) => {
    try {
        console.log('Creating role...');
        const db = c.var.db;
        const userId = c.var.jwtPayload.userId;

        // Parse the request body
        const body = await c.req.json<RoleRequestBody>();

        // Validate the request body
        if (!body.name) throw new Error('Role name is required');
        if (!body.orgId) throw new Error('Organization ID is required');

        // Create default permission structure based on scope
        const defaultPermissionFlags: PermissionFlags = {
            organization: {
                admin: false,
                editOrganization: false,
                deleteOrganization: false,
                editMembers: false,
                editRoles: false,
                editProjects: false,
                createProjects: false,
                deleteProjects: false
            },
            project: {
                editProject: false,
                deleteProject: false,
                editMembers: false,
                editRoles: false,
                uploadFiles: false
            }
        };

        // Initialize permissions based on scope
        const permissionFlags = body.scope === 'organization' 
            ? {
                organization: {
                    ...defaultPermissionFlags.organization,
                    ...(body.permissionFlags?.organization || {})
                },
                project: defaultPermissionFlags.project // Project permissions are disabled for organization scope
              }
            : {
                organization: defaultPermissionFlags.organization, // Organization permissions are disabled for project scope
                project: {
                    ...defaultPermissionFlags.project,
                    ...(body.permissionFlags?.project || {})
                }
              };

        const roleData : typeof roles.$inferInsert = {
            name: body.name,
            description: body.description,
            scope: body.scope,
            organizationId: body.orgId,
            permissionFlags: permissionFlags,
        };

        const result = await createRole(db, roleData, userId);
        if (!result.success) throw new Error(result.error);

        return c.json({ data: result.data });
    } catch (error) {
        console.error('Error in create role route:', error);
        return c.json({ error: 'Failed to create role', details: error.message }, 500);
    }
});

export default app;

