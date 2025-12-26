// server/anthropicProxy.js
// Backend proxy for Anthropic API to avoid CORS issues
// Compatible with Node.js 16+ and 18+

const express = require('express');
const router = express.Router();

// Handle fetch for different Node versions
let fetch;
try {
  // Node 18+ has native fetch
  fetch = globalThis.fetch;
} catch {
  // Node < 18 needs node-fetch
  try {
    fetch = require('node-fetch');
  } catch (err) {
    console.error('⚠️  fetch not available. Please upgrade to Node 18+ or run: npm install node-fetch@2');
  }
}

/**
 * Proxy endpoint for Anthropic API
 * POST /api/anthropic/messages
 */
router.post('/messages', async (req, res) => {
  // Check if fetch is available
  if (!fetch) {
    return res.status(500).json({ 
      error: 'fetch API not available',
      details: 'Please upgrade to Node.js 18+ or install node-fetch: npm install node-fetch@2'
    });
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ No API key found. Checked: ANTHROPIC_API_KEY, REACT_APP_ANTHROPIC_API_KEY');
    return res.status(500).json({ 
      error: 'Anthropic API key not configured on server',
      details: 'Add ANTHROPIC_API_KEY to your .env file in the project root'
    });
  }

  try {
    const { model, max_tokens, messages } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request: messages array required',
        details: 'Request body must include messages array'
      });
    }

    console.log('📡 Proxying request to Anthropic API...');
    console.log(`   Model: ${model || 'claude-sonnet-4-20250514'}`);
    console.log(`   Messages: ${messages.length}`);

    // Make request to Anthropic API from server
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1000,
        messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('❌ Anthropic API error:', errorData);
      
      // Provide helpful error messages
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid API key',
          details: 'Your Anthropic API key is invalid. Please check your .env file'
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please try again in a moment'
        });
      }
      
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    console.log('✅ Anthropic API response received');
    
    res.json(data);

  } catch (error) {
    console.error('❌ Error proxying to Anthropic:', error);
    
    // Provide helpful error messages
    if (error.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        error: 'Cannot reach Anthropic API',
        details: 'Check your internet connection'
      });
    }
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Request timeout',
        details: 'Anthropic API took too long to respond'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to proxy request to Anthropic API',
      details: error.message 
    });
  }
});

module.exports = router;