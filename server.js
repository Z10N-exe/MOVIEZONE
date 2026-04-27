import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

if (!existsSync(distPath)) {
    console.error('ERROR: dist folder not found. Run "npm run build" first.');
    process.exit(1);
}

const app = express();

app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js'))   res.setHeader('Content-Type', 'application/javascript');
        if (filePath.endsWith('.css'))  res.setHeader('Content-Type', 'text/css');
        if (filePath.endsWith('.svg'))  res.setHeader('Content-Type', 'image/svg+xml');
        if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
        if (filePath.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
        if (filePath.endsWith('.png'))  res.setHeader('Content-Type', 'image/png');
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
        if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
        if (filePath.endsWith('.ico'))  res.setHeader('Content-Type', 'image/x-icon');
    }
}));

// Health check endpoint
app.get('/ping', (req, res) => {
    res.status(200).send('Pong!');
});

// SPA fallback — all routes serve index.html so React Router handles them
app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Self-pinging mechanism to keep server awake on Render
const keepAlive = () => {
    const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
    if (url) {
        console.log(`Frontend keep-alive system initialized for ${url}`);
        setInterval(() => {
            fetch(`${url}/ping`)
                .then(() => console.log(`[${new Date().toISOString()}] Frontend keep-alive ping successful`))
                .catch(err => console.error(`[${new Date().toISOString()}] Frontend keep-alive ping failed:`, err.message));
        }, 13 * 60 * 1000);
    } else {
        console.log('Frontend keep-alive skipped: RENDER_EXTERNAL_URL not set');
    }
};

app.listen(PORT, () => {
    console.log(`Frontend serving on port ${PORT}`);
    keepAlive();
});
