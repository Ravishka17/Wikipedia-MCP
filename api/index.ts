import app from '../src/server';

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
