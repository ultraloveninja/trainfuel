// server/server.js
// Complete Express server with CORS support and Anthropic API proxy
// Run this alongside your React app

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load .env from parent directory (project root)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Also try loading from current directory as fallback
require('dotenv').config();

const anthropicProxy = require('./anthropicProxy');

const app = express();
const PORT = process.env.PORT || 5001;

// Debug: Check API key on startup
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

console.log('\n🔍 Environment Check:');
console.log('   Working directory:', process.cwd());
console.log('   .env location:', path.join(__dirname, '..', '.env'));

if (process.env.CLAUDE_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.log('   ⚠️  WARNING: Found CLAUDE_API_KEY but server expects ANTHROPIC_API_KEY');
  console.log('   💡 Please rename CLAUDE_API_KEY to ANTHROPIC_API_KEY in your .env file\n');
}

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your React app
  credentials: true
}));
app.use(express.json());

// Health check with detailed info
app.get('/health', (req, res) => {
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY);
  const wrongKey = !!process.env.CLAUDE_API_KEY;
  
  res.json({ 
    status: 'OK',
    anthropicConfigured: hasKey,
    warning: wrongKey && !hasKey ? 'Found CLAUDE_API_KEY instead of ANTHROPIC_API_KEY' : null,
    timestamp: new Date().toISOString()
  });
});

// Anthropic API proxy
app.use('/api/anthropic', anthropicProxy);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TrainFuel backend server running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for: http://localhost:3000`);
  
  // Check for API key
  if (process.env.ANTHROPIC_API_KEY) {
    console.log(`🤖 Anthropic API: Configured ✅ (ANTHROPIC_API_KEY)`);
  } else if (process.env.REACT_APP_ANTHROPIC_API_KEY) {
    console.log(`🤖 Anthropic API: Configured ✅ (REACT_APP_ANTHROPIC_API_KEY)`);
  } else if (process.env.CLAUDE_API_KEY) {
    console.log(`⚠️  Anthropic API: Wrong variable name!`);
    console.log(`   Found: CLAUDE_API_KEY`);
    console.log(`   Need: ANTHROPIC_API_KEY`);
    console.log(`   Please update your .env file\n`);
  } else {
    console.log(`❌ Anthropic API: Not configured`);
    console.log(`   Add ANTHROPIC_API_KEY=your_key to .env in project root\n`);
  }
});

module.exports = app;