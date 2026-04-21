// Add jojjeijapan.se to Firebase Auth authorized domains via REST API
const { execSync } = require('child_process');

const PROJECT_ID = 'japan-resa-2026';
const DOMAIN = 'jojjeijapan.se';

async function main() {
  // Firebase CLI stores its refresh token here
  const configDir = process.env.APPDATA
    ? `${process.env.APPDATA}\\configstore\\firebase-tools.json`
    : `${process.env.HOME}/.config/configstore/firebase-tools.json`;

  let config;
  try {
    config = require(configDir);
  } catch {
    console.error('Could not find Firebase CLI config. Run: firebase login');
    process.exit(1);
  }

  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) {
    console.error('No refresh token found. Run: firebase login');
    process.exit(1);
  }

  // Exchange refresh token for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('Failed to get access token:', tokenData);
    process.exit(1);
  }

  const accessToken = tokenData.access_token;
  console.log('Got access token successfully.');

  // Get current config
  const getUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`;
  const getRes = await fetch(getUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!getRes.ok) {
    const err = await getRes.text();
    console.error('Failed to get config:', getRes.status, err);
    process.exit(1);
  }

  const currentConfig = await getRes.json();
  const currentDomains = currentConfig.authorizedDomains || [];
  console.log('Current authorized domains:', currentDomains);

  if (currentDomains.includes(DOMAIN)) {
    console.log(`${DOMAIN} is already authorized!`);
    return;
  }

  // Add domain
  const newDomains = [...currentDomains, DOMAIN];
  const patchRes = await fetch(`${getUrl}?updateMask=authorizedDomains`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authorizedDomains: newDomains }),
  });

  if (!patchRes.ok) {
    const err = await patchRes.text();
    console.error('Failed to update:', patchRes.status, err);
    process.exit(1);
  }

  const result = await patchRes.json();
  console.log('SUCCESS! Authorized domains now:', result.authorizedDomains);
}

main().catch(console.error);
