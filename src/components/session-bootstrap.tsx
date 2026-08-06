// Refreshes protected summaries automatically after a sign-in or restored session.

import { useEffect } from 'react';

import { useBackendAccess } from '@/providers/backend-access-provider';

export function SessionBootstrap() {
  const { signedIn, restoring, status, snapshot, testAccess } = useBackendAccess();

  useEffect(() => {
    if (signedIn && !restoring && !snapshot && status === 'idle') {
      void testAccess();
    }
  }, [restoring, signedIn, snapshot, status, testAccess]);

  return null;
}
