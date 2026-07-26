import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useCallback } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

// A message thread is a real record, so this opens the messageThread record page
// rather than a bespoke panel — the same route EmailThreadPreview already takes.
export const useOpenEmailThreadInSidePanel = () => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const openEmailThreadInSidePanel = useCallback(
    (messageThreadId: string) => {
      openRecordInSidePanel({
        recordId: messageThreadId,
        objectNameSingular: CoreObjectNameSingular.MessageThread,
      });
    },
    [openRecordInSidePanel],
  );

  return {
    openEmailThreadInSidePanel,
  };
};
