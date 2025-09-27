#!/usr/bin/env node

/**
 * Database Setup Script for AI Interview Assistant
 * 
 * This script helps you set up the Supabase database schema.
 * 
 * Usage:
 * 1. Make sure you have created a Supabase project
 * 2. Update your .env file with the correct credentials
 * 3. Run: node setup-database.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AI Interview Assistant - Database Setup');
console.log('==========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found!');
  console.log('Please create a .env file with your Supabase credentials:');
  console.log('');
  console.log('VITE_SUPABASE_URL=https://your-project-id.supabase.co');
  console.log('VITE_SUPABASE_ANON_KEY=your-anon-key');
  console.log('VITE_GEMINI_API_KEY=your-gemini-api-key');
  console.log('');
  process.exit(1);
}

// Check if schema file exists
const schemaPath = path.join(__dirname, 'supabase-schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Error: supabase-schema.sql file not found!');
  process.exit(1);
}

console.log('✅ Environment file found');
console.log('✅ Schema file found');
console.log('');

console.log('📋 Next Steps:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to the SQL Editor');
console.log('3. Copy and paste the contents of supabase-schema.sql');
console.log('4. Click "Run" to execute the schema');
console.log('');

console.log('📁 Schema file location:', schemaPath);
console.log('');

// Read and display first few lines of schema
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const lines = schemaContent.split('\n').slice(0, 10);

console.log('📄 Schema preview:');
console.log('------------------');
lines.forEach(line => console.log(line));
console.log('... (and more)');
console.log('');

console.log('🔗 Useful Links:');
console.log('- Supabase Dashboard: https://app.supabase.com');
console.log('- Setup Guide: ./SUPABASE_SETUP.md');
console.log('');

console.log('✨ Once the schema is set up, you can start the application:');
console.log('npm run dev');
console.log('');