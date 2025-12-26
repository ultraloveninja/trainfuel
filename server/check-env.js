// server/check-env.js
// Run this to diagnose .env issues
// Usage: node server/check-env.js

require('dotenv').config();

console.log('\n🔍 Environment Variable Diagnostics\n');
console.log('═'.repeat(50));

// Check current directory
console.log('\n📁 Current working directory:');
console.log('   ', process.cwd());

// Check if .env file exists
const fs = require('fs');
const path = require('path');

console.log('\n📄 Checking for .env files:');

const locations = [
  '.env',                          // Root
  '../.env',                       // One level up
  path.join(__dirname, '../.env'), // Explicitly root
  path.join(__dirname, '.env')     // In server/
];

locations.forEach(loc => {
  const fullPath = path.resolve(loc);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${exists ? '✅' : '❌'} ${fullPath}`);
  
  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    console.log(`      Contains ${lines.length} non-comment lines`);
    
    // Check for API key variables
    const hasAnthropic = lines.some(l => l.includes('ANTHROPIC_API_KEY'));
    const hasClaude = lines.some(l => l.includes('CLAUDE_API_KEY'));
    const hasReactAnthropic = lines.some(l => l.includes('REACT_APP_ANTHROPIC_API_KEY'));
    
    if (hasAnthropic) console.log('      ✅ Has ANTHROPIC_API_KEY');
    if (hasClaude) console.log('      ⚠️  Has CLAUDE_API_KEY (should be ANTHROPIC_API_KEY)');
    if (hasReactAnthropic) console.log('      ✅ Has REACT_APP_ANTHROPIC_API_KEY');
  }
});

console.log('\n🔑 Environment Variables Check:');
console.log('   ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 
  `✅ Set (${process.env.ANTHROPIC_API_KEY.substring(0, 15)}...)` : 
  '❌ Not set'
);

console.log('   REACT_APP_ANTHROPIC_API_KEY:', process.env.REACT_APP_ANTHROPIC_API_KEY ? 
  `✅ Set (${process.env.REACT_APP_ANTHROPIC_API_KEY.substring(0, 15)}...)` : 
  '❌ Not set'
);

console.log('   CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? 
  `⚠️  Set (wrong name - should be ANTHROPIC_API_KEY)` : 
  '❌ Not set'
);

console.log('\n📊 Summary:');

const hasKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;

if (hasKey) {
  console.log('   ✅ Server will work! API key is accessible.');
} else if (process.env.CLAUDE_API_KEY) {
  console.log('   ❌ Wrong variable name!');
  console.log('   💡 Change CLAUDE_API_KEY to ANTHROPIC_API_KEY in your .env');
} else {
  console.log('   ❌ No API key found!');
  console.log('   💡 Add ANTHROPIC_API_KEY=your_key to .env in project root');
}

console.log('\n' + '═'.repeat(50) + '\n');