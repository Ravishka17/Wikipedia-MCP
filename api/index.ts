import app from '../dist/server.js';

// Vercel serverless function handler
export default app;

// For Vercel API routes
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
