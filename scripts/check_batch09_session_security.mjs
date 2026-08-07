// Verifies that Batch 9 web/native session handling keeps the reviewed security invariants.

import { readFileSync } from 'node:fs';

const providerPath = 'src/providers/backend-access-provider.tsx';
const authApiPath = 'src/services/auth-api.ts';
const appConfigPath = 'app.config.js';

const provider = readFileSync(providerPath, 'utf8');
const authApi = readFileSync(authApiPath, 'utf8');
const appConfig = readFileSync(appConfigPath, 'utf8');

const checks = [
  [
    provider.includes('globalThis.sessionStorage?.getItem(key)'),
    'Web session restoration must read secrets from sessionStorage.',
  ],
  [
    provider.includes('globalThis.sessionStorage?.setItem(key, token)'),
    'Web session persistence must write secrets to sessionStorage.',
  ],
  [
    !provider.includes('localStorage?.setItem(REFRESH_TOKEN_STORAGE_KEY'),
    'Refresh tokens must never be written to localStorage.',
  ],
  [
    provider.includes('globalThis.localStorage?.removeItem(key)'),
    'The migration must delete stale persistent browser token copies.',
  ],
  [
    provider.includes("const PENDING_REVOCATION_STORAGE_KEY = 'takwimucheck.pending-revocation.v1'"),
    'Offline sign-out must retain a dedicated pending-revocation credential.',
  ],
  [
    provider.includes('sessionGenerationRef.current += 1'),
    'Sign-out must invalidate in-flight session mutations.',
  ],
  [
    provider.includes('signingOutRef.current || generation !== sessionGenerationRef.current'),
    'A stale refresh result must not be reapplied after sign-out/session replacement.',
  ],
  [
    provider.includes('await requestRevokeSession(revocationToken)'),
    'Sign-out must revoke the backend session with the refresh credential.',
  ],
  [
    authApi.includes("await request<unknown>('/auth/revoke'"),
    'The mobile auth client must expose the backend refresh-token revocation endpoint.',
  ],
  [
    appConfig.includes("process.env.APP_VARIANT === 'development'"),
    'Cleartext transport must remain tied to the explicit development build variant.',
  ],
  [
    appConfig.includes('usesCleartextTraffic: isDevelopmentBuild'),
    'Production/preview builds must not unconditionally enable cleartext traffic.',
  ],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error('Batch 9 session security check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('BATCH 9 MOBILE SESSION SECURITY: PASSED');
console.log('Web refresh storage: sessionStorage only');
console.log('Stale localStorage token cleanup: present');
console.log('Refresh/sign-out race guard: present');
console.log('Offline backend revocation retry: present');
console.log('Production cleartext transport: disabled by build profile');