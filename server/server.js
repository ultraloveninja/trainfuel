// server/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Claude API endpoint
app.post('/api/claude', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Call Anthropic Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    // Send back the Claude response
    res.json({
      content: response.data.content[0].text,
      usage: response.data.usage
    });

  } catch (error) {
    console.error('Error calling Claude API:', error.response?.data || error.message);

    // Return a fallback response if Claude API fails
    res.status(500).json({
      error: 'Failed to get AI response',
      fallback: true,
      message: error.message,
      statusCode: error.response?.status,
      // Don't send API key or sensitive data
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Claude API Key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
});