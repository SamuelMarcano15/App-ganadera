import { useState } from 'react';
import { forceFullResync } from '@/lib/syncUtils';

export function useForceResync() {
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncSuccess, setResyncSuccess] = useState(false);

  const handleForceSync = async (onSuccessCallback) => {
    if (isResyncing) return;
    
    setIsResyncing(true);
    setResyncSuccess(false);

    const result = await forceFullResync();

    setIsResyncing(false);
    if (result) {
      setResyncSuccess(true);
      setTimeout(() => {
        setResyncSuccess(false);
        if (onSuccessCallback) onSuccessCallback();
      }, 3000);
    }
  };

  return { isResyncing, resyncSuccess, handleForceSync };
}
