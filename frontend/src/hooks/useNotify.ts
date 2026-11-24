import { useContext } from 'react';
import { NotificationContext, type Notifier } from '../context/NotificationContext';

export function useNotify(): Notifier {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotify must be used inside <NotificationProvider>');
  return value;
}
