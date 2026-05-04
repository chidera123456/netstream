import express from 'express';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for video download proxy
  app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url as string;

    if (!videoUrl) {
      return res.status(400).send('Video URL is required');
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
        timeout: 30000, // 30 second timeout
      });

      // Extract filename from URL or use default
      const filename = path.basename(new URL(videoUrl).pathname) || 'video.mp4';
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');

      response.data.pipe(res);
    } catch (error: any) {
      console.error('Download error:', error.message);
      res.status(500).send('Error fetching video content');
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
