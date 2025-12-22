import app from './server.js';

// For Vercel deployment
export default app;

// For local development
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  const port = process.env.PORT || 8000;
  app.listen(port, () => {
    console.log(`Wikipedia MCP Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`MCP info: http://localhost:${port}/mcp`);
  });
}
