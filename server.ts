import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server-routes';
import { initCronJobs } from './src/server-cron';

/**
 * Main Express server entry point for Point 4 application.
 * Manages API routes, background jobs (cron), and Vite middleware for the React frontend.
 */
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // ==========================================
  // API ROUTES
  // ==========================================
  
  /**
   * Health check endpoint
   */
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Point 4 API is running' });
  });

  // Mount Point 4 Business Logic API routes
  app.use('/api', apiRouter);

  // Initialize Point 4 Background Automation (Cron)
  initCronJobs();

  // ==========================================
  // VITE MIDDLEWARE (Frontend Serving)
  // ==========================================
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

  // Bind to 0.0.0.0 and Port 3000 as required
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
