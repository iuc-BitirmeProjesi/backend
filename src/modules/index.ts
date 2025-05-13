import { Hono } from 'hono';
// import { bearerAuth } from 'hono/bearer-auth';
import { Variables } from '../types';

import users from './users/route';
import auth from './auth/route';
import organizations from './organizations/route';
import { jwt } from 'hono/jwt';
import { payloadType } from './auth/types';

const app = new Hono<{ Variables: Variables }>();

app.route('/auth', auth);

app.use(
    '*',
    jwt({
        secret: 'honoiscool',
    })
);

app.get('/', (c) => {
    console.log('Hello from Hono!');
    const payload = c.var.jwtPayload as payloadType;
    return c.json(payload); // eg: { "sub": "1234567890", "name": "John Doe", "iat": 1516239022 }
});

app.route('/users', users);

app.route('/organizations', organizations);

export default app;
