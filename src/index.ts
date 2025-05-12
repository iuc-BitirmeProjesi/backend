import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { drizzle } from 'drizzle-orm/libsql/node';
import { Variables } from './types';

// Routes
import users from './modules/users/route';
import auth from './modules/auth/route';

const app = new Hono<{ Variables: Variables }>();

app.use('*', cors());

app.use('*', async (c, next) => {
    const db = drizzle('file:database.db');

    const result = await db.run('select 1');
    const health = result.rows[0][0] === 1;
    if (!health) {
        return c.json({ error: 'Database is not healthy' }, 500);
    }

    c.set('db', db);
    return next();
});

app.get('/', (c) => c.text('Hello Node!'));

app.post('/query', async (c) => {
    try {
        const db = c.var.db;
        const { query } = await c.req.json();
        const result = await db.run(query);
        return c.json(result);
    } catch (error: any) {
        console.error('Error executing query:', error);
        return c.json({ error: 'Failed to execute query', message: error.message }, 500);
    }
});

app.route('/auth', auth);

const token = 'honoiscool';

app.use('/api/*', bearerAuth({ token }));

app.route('/users', users);

serve({
    fetch: app.fetch,
    port: 8787,
});
