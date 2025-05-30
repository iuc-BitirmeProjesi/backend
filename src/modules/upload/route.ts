import { Hono } from 'hono';
import type { Variables } from '../../types';
import type { projects } from '../../db/schema';
import { saveFile } from './service';
import fs from 'fs';
import { jwt } from 'hono/jwt';

const app = new Hono<{ Variables: Variables }>();

// Get image upload from the server
app.get('/public/:uuid', (c) => {
    try {
        const uuid = c.req.param('uuid');
        if (!uuid) throw new Error('UUID is required');
        const filePath = `./bucket/public/${uuid}.png`;
        if (!filePath) throw new Error('Profile picture not found');
        const fileExists = fs.existsSync(filePath);
        if (!fileExists) throw new Error('Profile picture not found');

        const fileBuffer = fs.readFileSync(filePath);
        if (!fileBuffer) throw new Error('Failed to read profile picture file');

        return c.body(fileBuffer, 200, {
            'Content-Type': 'image/jpeg', // Adjust based on your file type
        });
    } catch (error) {
        console.error('Error in get profile picture route:', error);
        return c.json(
            { error: 'Failed to retrieve profile picture', details: error.message },
            500
        );
    }
});

app.use(
    '*',
    jwt({
        secret: 'honoiscool',
    })
);

// Upload profile picture to the server
app.post('/uploadPicture', async (c) => {
    try {
        // Handle file upload logic here
        const file = await c.req.arrayBuffer();
        if (!file) throw new Error('Profile picture file is required');      
        
        const uuid = crypto.randomUUID();
        const uploadPath = `./bucket/public/${uuid}.png`;

        // Save the file to the server or cloud storage
        const result = await saveFile(file, uploadPath);

        if (!result) throw new Error('Failed to save profile picture');

        return c.json({
            url: `http://localhost:8787/api/bucket/public/${uuid}`, 
        });
    } catch (error) {
        console.error('Error in upload profile picture route:', error);
        return c.json(
            {
                error: 'Failed to upload profile picture',
                details: error.message,
            },
            500
        );
    }
});

export default app;
