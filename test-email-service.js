#!/usr/bin/env node

/**
 * Email Service Test Script
 * Tests the current email service configuration
 */

console.log('🔧 Email Service Configuration Test');
console.log('===================================\n');

// Check environment variables
console.log('📧 Environment Variables:');
console.log('  VITE_EMAILJS_SERVICE_ID:', process.env.VITE_EMAILJS_SERVICE_ID || 'Not set');
console.log('  VITE_EMAILJS_TEMPLATE_ID:', process.env.VITE_EMAILJS_TEMPLATE_ID || 'Not set');
console.log('  VITE_EMAILJS_PUBLIC_KEY:', process.env.VITE_EMAILJS_PUBLIC_KEY ? 'Set' : 'Not set');
console.log('  VITE_PLATFORM_ADMIN_EMAIL:', process.env.VITE_PLATFORM_ADMIN_EMAIL || 'Not set');

// Check if .env file exists
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log('\n✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📄 .env content:');
  console.log(envContent);
} else {
  console.log('\n❌ .env file does not exist');
}

console.log('\n📋 EmailJS Setup Status:');
console.log('========================');

// Check if EmailJS is configured
const hasServiceId = process.env.VITE_EMAILJS_SERVICE_ID && process.env.VITE_EMAILJS_SERVICE_ID !== 'your_service_id_here';
const hasTemplateId = process.env.VITE_EMAILJS_TEMPLATE_ID && process.env.VITE_EMAILJS_TEMPLATE_ID !== 'template_org_request';
const hasPublicKey = process.env.VITE_EMAILJS_PUBLIC_KEY && process.env.VITE_EMAILJS_PUBLIC_KEY !== 'your_public_key_here';

if (hasServiceId && hasTemplateId && hasPublicKey) {
  console.log('✅ EmailJS is fully configured');
  console.log('🎉 Email notifications should work!');
} else {
  console.log('❌ EmailJS is not configured');
  console.log('\n📋 Missing Configuration:');
  if (!hasServiceId) console.log('  - Service ID not set');
  if (!hasTemplateId) console.log('  - Template ID not set');
  if (!hasPublicKey) console.log('  - Public Key not set');
  
  console.log('\n🚀 To set up EmailJS:');
  console.log('1. Create account at https://www.emailjs.com/');
  console.log('2. Create email service and templates');
  console.log('3. Run: node setup-emailjs.js');
  console.log('4. Restart development server');
}

console.log('\n🧪 Testing Instructions:');
console.log('=======================');
console.log('1. Start development server: npm run dev');
console.log('2. Open browser console');
console.log('3. Run: window.testEmail()');
console.log('4. Check console for email sending logs');

console.log('\n📚 Documentation:');
console.log('=================');
console.log('- Quick Setup: EMAILJS_QUICK_SETUP.md');
console.log('- Detailed Guide: EMAILJS_SETUP.md');
console.log('- EmailJS Dashboard: https://dashboard.emailjs.com/');
