import { Hono } from "hono";
import type { Variables } from '../../types';
import {

} from './service';
import type { projects } from "../../db/schema";

const app = new Hono<{ Variables: Variables }>();

//get all projects with userId for specific organization
app.get('/all', async (c) => {
    try {
        const db = c.var.db;
        const userId = c.var.jwtPayload.userId;
        const organizationId = c.req.header('orgId');
        if (!organizationId) throw new Error('Organization ID is required');
        
        const result = await getTask(db, userId, Number(organizationId));

        if (!result.success) throw new Error(result.error);

        return c.json({ data: result.data });
    }catch (error) {
        console.error('Error in get projects route:', error);
        return c.json({ error: 'Failed to retrieve projects', details: error.message }, 500);
    }
})

export default app;
