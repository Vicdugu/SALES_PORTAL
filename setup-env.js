import { execSync } from 'child_process';

// Get the project ID
const projectId = 'sales-till';

// Email service configuration
const credentials = {
  // Resend API key is configured via environment variables
  // EMAIL_FROM should be set in .env.local and .env.production
};

console.log('Setting Vercel environment variables...');

try {
  // Try to link the project first
  try {
    execSync('vercel link --confirm', { stdio: 'inherit' });
  } catch (e) {
    console.log('Project already linked or error linking.');
  }

  // Set each environment variable
  for (const [key, value] of Object.entries(credentials)) {
    console.log(`\nSetting ${key}...`);
    execSync(`echo "${value}" | vercel env add ${key} production`, { stdio: 'inherit', shell: true });
  }

  console.log('\n✅ All environment variables set successfully!');
} catch (err) {
  console.error('Error setting environment variables:', err);
}
