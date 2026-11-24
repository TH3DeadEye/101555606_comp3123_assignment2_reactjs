import { createContext } from 'react';

// Short messages shown in a toast at the bottom of the screen.
export interface Notifier {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export const NotificationContext = createContext<Notifier | null>(null);
