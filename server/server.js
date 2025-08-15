// server/server.js - Simple proxy server for Anthropic API
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: '../.env' }); // Load from parent directory

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your React app
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Proxy server is running',
    timestamp: new Date().toISOString()
  });
});

// Main proxy endpoint for Claude/Anthropic API
app.post('/api/claude', async (req, res) => {
  try {
    console.log('📡 Proxying request to Anthropic API...');
    
    // Validate API key exists
    const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
    if (!apiKey) {
      console.error('❌ No API key found in environment variables');
      return res.status(500).json({
        error: 'Server configuration error: API key not found'
      });
    }

    // Make request to Anthropic
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: req.body.model || 'claude-sonnet-4-20250514',  // Using your working model
      max_tokens: req.body.max_tokens || 1000,
      messages: req.body.messages,
      temperature: req.body.temperature || 0.7,
      system: req.body.system
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    console.log('✅ Successfully received response from Anthropic');
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error calling Anthropic API:', error.response?.data || error.message);
    
    // Send appropriate error response
    if (error.response) {
      // API returned an error
      res.status(error.response.status).json({
        error: error.response.data.error || error.response.data
      });
    } else if (error.request) {
      // Request was made but no response
      res.status(503).json({
        error: 'Unable to reach Anthropic API'
      });
    } else {
      // Something else went wrong
      res.status(500).json({
        error: error.message
      });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Proxy Server Started Successfully!
📡 Listening on: http://localhost:${PORT}
🔗 React app should connect to: http://localhost:${PORT}/api/claude
✅ Health check: http://localhost:${PORT}/api/health

Environment:
- Claude API Key: ${process.env.REACT_APP_CLAUDE_API_KEY ? '✅ Found' : '❌ Missing'}
- Port: ${PORT}
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down proxy server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down proxy server gracefully...');
  process.exit(0);
});