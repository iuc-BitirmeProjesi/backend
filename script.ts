// In here we will insert initialization data to the database

import { drizzle } from 'drizzle-orm/libsql/node';
import bcrypt from 'bcryptjs';
import { roles, users,project_type } from './src/db/schema';

import { config } from 'dotenv';
config();


(async () => {
    const db = drizzle('file:database.db');

    const result = await db.run('select 1');
    const health = result.rows[0][0] === 1;
    if (!health) {
        throw new Error('Database is not healthy');
    }

    // add user. email: admin@[process.env.DOMAIN], password: admin
    const email = `${process.env.ADMIN_EMAIL}`;
    const password = `${process.env.ADMIN_PASSWORD}`;
    if (!email || !password) {
        throw new Error('Email and password are required');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
        email,
        password: hashedPassword,
        isActiveUser: true,
    });
    console.log(`User ${email} created with password ${password}`);

    // insert role to the database. name: admin, description: admin, scope: organization, permission_flags: {"admin": true}, organization_id: 0
    await db.insert(roles).values({
        name: 'admin',
        description: 'admin',
        scope: 'organization',
        permissionFlags: JSON.stringify({ admin: true }),
    });

    //insert into project_types table for seeding
    await db.insert(project_type).values([
        { id: 1, name: 'classification' },
        { id: 2, name: 'object detection' },
    ]);
})();
