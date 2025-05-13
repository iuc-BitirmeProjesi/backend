import { Hono } from 'hono';
import type { Variables } from '../../types';

const app = new Hono<{ Variables: Variables }>();

app.get('/', (c) => {
    return c.json({ message: 'Hello from users!' });
});
export default app;
