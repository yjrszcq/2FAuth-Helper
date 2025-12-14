#!/usr/bin/env node

const tokenManager = require('./token-manager');
const twofauthClient = require('./twofauth-client');
const config = require('./config');

async function main() {
  // Validate configuration
  if (!config.twofauthEmail || !config.twofauthPassword) {
    console.error('Error: TWOFAUTH_EMAIL and TWOFAUTH_PASSWORD environment variables are required');
    process.exit(1);
  }

  if (!config.twofauthUrl) {
    console.error('Error: TWOFAUTH_URL environment variable is required');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Verifying 2FAuth credentials...');
  console.log(`Server: ${config.twofauthUrl}`);
  console.log(`Email: ${config.twofauthEmail}`);
  console.log('='.repeat(60));

  try {
    // Try to login to 2FAuth first
    const loginSuccess = await twofauthClient.login();

    if (!loginSuccess) {
      console.error('');
      console.error('ERROR: Failed to login to 2FAuth server!');
      console.error('Please check your credentials and server URL.');
      console.error('');
      console.error('Make sure:');
      console.error('  - TWOFAUTH_URL is correct and accessible');
      console.error('  - TWOFAUTH_EMAIL is your 2FAuth account email');
      console.error('  - TWOFAUTH_PASSWORD is correct');
      console.error('');
      process.exit(1);
    }

    console.log('');
    console.log('Login successful!');
    console.log('');

    // Generate a new token (this invalidates the old one)
    const newToken = tokenManager.generateToken();

    console.log('='.repeat(60));
    console.log('New token generated successfully!');
    console.log('The previous token (if any) has been invalidated.');
    console.log('='.repeat(60));
    console.log('');
    console.log('Your new token:');
    console.log('');
    console.log(newToken);
    console.log('');
    console.log('='.repeat(60));
    console.log('Use this token in your browser extension to authenticate.');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('ERROR: Failed to connect to 2FAuth server!');
    console.error(`Reason: ${error.message}`);
    console.error('');
    process.exit(1);
  }
}

main();
