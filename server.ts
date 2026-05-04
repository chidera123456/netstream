import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for all routes
  app.use(cors());

  // API Route for video download proxy
  app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url as string;

    if (!videoUrl) {
      return res.status(400).send('No URL provided');
    }

    try {
      const response = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(videoUrl).origin,
        },
        timeout: 60000, // 60 second timeout for stream initialization
      });

      // Extract filename from URL or use a default
      let filename = 'movie.mp4';
      try {
        const urlPath = new URL(videoUrl).pathname;
        const base = path.basename(urlPath);
        if (base && base.includes('.')) {
          filename = base;
        }
      } catch (e) {
        // Fallback to default
      }
      
      // Force download headers
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');

      // Pipe the stream directly
      response.data.pipe(res);
      
      // Handle client disconnect
      res.on('close', () => {
        response.data.destroy();
      });
    } catch (error: any) {
      console.error("Proxy Error:", error.message);
      res.status(500).send('Failed to fetch video content');
    }
  });

  // Vite middleware integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
