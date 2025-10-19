import PocketBase from 'pocketbase';
import { info, warn, error as logError, debug } from '../utils/logger.mjs';

const BASE_URL = process.env.PB_BASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'porchroot@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'AdminPassword69!';

const pb = new PocketBase(BASE_URL);

let authPromise = null;

async function authenticate(reason = 'initial auth') {
  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    try {
      info('PocketBase admin authentication starting', { reason });
      await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      info('PocketBase admin authentication successful');
    } catch (err) {
      logError('PocketBase admin authentication failed', {
        reason,
        error: err?.message || err,
      });
      throw err;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

async function ensureAuth(reason) {
  if (pb.authStore.isValid) {
    debug('PocketBase authStore already valid');
    return;
  }
  await authenticate(reason);
}

async function executeWithAuth(action, context = {}) {
  await ensureAuth(context.reason || 'executeWithAuth');

  try {
    return await action(pb);
  } catch (err) {
    if (err?.status === 401) {
      warn('PocketBase request returned 401, retrying once after re-auth', {
        context,
      });
      pb.authStore.clear();
      await authenticate('retry after 401');
      return action(pb);
    }

    logError('PocketBase request failed', {
      context,
      error: err?.message || err,
      status: err?.status,
      response: err?.response,
      data: err?.data,
      fullError: JSON.stringify(err, null, 2)
    });
    throw err;
  }
}

export { pb, authenticate, ensureAuth, executeWithAuth, BASE_URL };
