import { Hono } from 'hono';
import { loginUser } from './service';
import { UserLogin } from './types'; // Assuming you create a types.ts file
import { Variables } from '../../types';

const auth = new Hono<{ Variables: Variables }>()

// POST /api/users/login
auth.post('/login', async (c) => {
    try {
        const body = await c.req.json<UserLogin>();
        const result = await loginUser(c.var.db, body);

        if ('error' in result) {
            return c.json({ error: result.error });
        }

        return c.json({ token: result.token });
    } catch (error) {
        console.error('Login route error:', error);
        // Check if it's a JSON parsing error
        if (error instanceof SyntaxError) {
            return c.json({ error: 'Invalid JSON payload' }, 400);
        }
        return c.json({ error: 'Failed to process login request' }, 500);
    }
});

export default auth;
