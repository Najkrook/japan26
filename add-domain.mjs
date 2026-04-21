// One-off script to add jojjeijapan.se to Firebase Auth authorized domains
// via the Identity Toolkit REST API

import { execSync } from 'child_process';

const PROJECT_ID = 'japan-resa-2026';
const DOMAIN_TO_ADD = 'jojjeijapan.se';

// Get an access token from the Firebase CLI (it's already logged in)
const token = execSync('npx firebase login:ci --no-localhost 2>nul || echo ""', { encoding: 'utf-8' }).trim();

// Use the firebase CLI's cached token instead
const tokenFromCli = execSync('npx firebase --open-sesame token 2>nul || echo ""', { encoding: 'utf-8' }).trim();

// Simplest approach: use firebase CLI's internal auth
async function addDomain() {
  try {
    // First, get current config
    const getUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`;
    
    // Get access token from firebase internals
    const accessToken = execSync(
      'node -e "const c = require(\'firebase-tools\'); c.login.use().then(t => process.stdout.write(t.tokens.access_token))"',
      { encoding: 'utf-8', cwd: process.cwd() }
    ).trim();

    console.log('Got access token, fetching current config...');

    const getRes = await fetch(getUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const config = await getRes.json();
    
    console.log('Current authorized domains:', config.authorizedDomains);

    // Add our domain if not already there
    const domains = config.authorizedDomains || [];
    if (domains.includes(DOMAIN_TO_ADD)) {
      console.log(`${DOMAIN_TO_ADD} is already authorized!`);
      return;
    }

    domains.push(DOMAIN_TO_ADD);

    // Patch the config
    const patchRes = await fetch(`${getUrl}?updateMask=authorizedDomains`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorizedDomains: domains }),
    });

    const result = await patchRes.json();
    
    if (patchRes.ok) {
      console.log('SUCCESS! Updated authorized domains:', result.authorizedDomains);
    } else {
      console.error('Failed:', result);
    }
  } catch (err) {
    console.error('Error:', err.message);
    
    // Fallback: try using firebase-tools programmatically
    console.log('\nTrying alternative approach...');
    try {
      const firebase = await import('firebase-tools');
      const token = await firebase.default.login.ci();
      console.log('Firebase token obtained');
    } catch (e2) {
      console.error('Alternative also failed:', e2.message);
      console.log('\nManual fallback: Run this in your browser console at https://console.firebase.google.com:');
      console.log(`
fetch('https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=authorizedDomains', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + await (await fetch('https://accounts.google.com/o/oauth2/token')).text(),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({authorizedDomains: ['localhost','japan-resa-2026.firebaseapp.com','japan-resa-2026.web.app','${DOMAIN_TO_ADD}']})
})
      `);
    }
  }
}

addDomain();
