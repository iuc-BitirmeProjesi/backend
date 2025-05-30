import fs from 'fs';

export const saveFile = async (file: ArrayBuffer, path: string): Promise<boolean> => {
    // Create directory if it doesn't exist
    const dir = path.split('/').slice(0, -1).join('/');
    await fs.promises.mkdir(dir, { recursive: true });

    return new Promise((resolve, reject) => {
        fs.writeFile(path, Buffer.from(file), (err) => {
            if (err) {
                console.error('Error saving file:', err);
                return reject(err);
            }
            resolve(true);
        });
    });
};
