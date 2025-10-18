import PocketBase from 'pocketbase';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';

const pb = new PocketBase(BASE_URL);

const log = console.log;

async function ensureUsersCollection() {
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    await pb.collections.getOne('users');
  } catch (error) {
    log('Admin authentication failed; continuing with existing configuration.');
  } finally {
    pb.authStore.clear();
  }
}

async function registerUser(email, password) {
  try {
    const record = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      displayName: 'CLI Registered User',
    });
    log('Registered new user:', record.id);
    return record;
  } catch (error) {
    throw new Error(`Registration failed: ${error?.data?.message || error?.message}`);
  }
}

function getTokenExpiry(token) {
  try {
    const [, payload] = token.split('.');
    const parsed = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (parsed.exp) {
      return new Date(parsed.exp * 1000).toISOString();
    }
  } catch {
    // ignore decode failures
  }
  return 'unknown';
}

async function loginUser(email, password) {
  const authData = await pb.collection('users').authWithPassword(email, password);
  log('Logged in as:', authData.record.email);
  log('Token expires at:', getTokenExpiry(pb.authStore.token));
  return authData.record;
}

async function refreshSession() {
  const refreshed = await pb.collection('users').authRefresh();
  log('Token refreshed. New expiry:', getTokenExpiry(pb.authStore.token));
  return refreshed;
}

async function updateProfile(userId, updates) {
  const updated = await pb.collection('users').update(userId, updates, { requestKey: null });
  log('Profile updated:', { displayName: updated.displayName, bio: updated.bio });
}

async function passwordReset(email) {
  await pb.collection('users').requestPasswordReset(email);
  log('Password reset email requested (check server logs for mailer output).');
}

async function logout() {
  pb.authStore.clear();
  log('Logged out; auth store cleared.');
}

async function demoAuthFlow() {
  await ensureUsersCollection();

  const email = `user${Date.now()}@pocketbase.dev`;
  const password = 'PocketBaseAuth42';

  await registerUser(email, password);
  const record = await loginUser(email, password);

  await refreshSession();
  await updateProfile(record.id, {
    displayName: 'Updated CLI User',
    bio: 'Updated from auth-demo.mjs',
  });

  await passwordReset(email);

  await logout();

  try {
    await updateProfile(record.id, { bio: 'Should not succeed' });
  } catch (error) {
    log('Expected failure after logout:', error?.data?.message || error?.message);
  }
}

(async () => {
  try {
    await demoAuthFlow();
  } catch (error) {
    console.error('Auth demo failed:', error?.message || error);
  } finally {
    pb.authStore.clear();
  }
})();
