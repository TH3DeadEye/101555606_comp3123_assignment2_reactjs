import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar, { type SnackbarCloseReason } from '@mui/material/Snackbar';
import { useCallback, useMemo, useState, type ReactNode, type SyntheticEvent } from 'react';
import { NotificationContext, type Notifier } from './NotificationContext';

interface Notice {
  id: number;
  severity: AlertColor;
  message: string;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((severity: AlertColor, message: string) => {
    // A new id restarts the auto-hide timer when a message replaces another.
    setNotice({ id: Date.now() + Math.random(), severity, message });
    setOpen(true);
  }, []);

  const notifier = useMemo<Notifier>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  );

  const handleClose = (_event: Event | SyntheticEvent, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') return; // clicking elsewhere should not hide it
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={notifier}>
      {children}
      {notice && (
        <Snackbar
          key={notice.id}
          open={open}
          autoHideDuration={notice.severity === 'error' ? 8000 : 5000}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={notice.severity}
            variant="filled"
            onClose={() => setOpen(false)}
            // Errors interrupt screen readers, other messages wait politely.
            role={notice.severity === 'error' ? 'alert' : 'status'}
            sx={{ width: '100%' }}
          >
            {notice.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
}
