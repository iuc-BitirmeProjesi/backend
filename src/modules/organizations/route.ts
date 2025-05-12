import { Hono } from 'hono';
import { Variables } from '../../types';

const app = new Hono<{ Variables: Variables }>();

app.get('/', (c) => {
    return c.json({ message: 'Hello from organizations!' });
});

export default app;
