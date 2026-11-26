import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { AppError } from '../utils/errors';

// The three situations every data screen has to handle besides "it worked".

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box role="status" aria-live="polite" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 8 }}>
      <CircularProgress size={28} />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  // A button that gets the user out of the empty screen ("Add employee", "Clear search")
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Paper sx={{ textAlign: 'center', py: 8, px: 2 }}>
      {icon && <Box sx={{ color: 'text.disabled', fontSize: 56, lineHeight: 1, mb: 1 }}>{icon}</Box>}
      <Typography variant="h3" component="h2" gutterBottom>
        {title}
      </Typography>
      {message && (
        <Typography color="text.secondary" sx={{ mb: action ? 3 : 0 }}>
          {message}
        </Typography>
      )}
      {action}
    </Paper>
  );
}

interface ErrorStateProps {
  error: AppError;
  onRetry?: () => void;
  // Where to offer to go back to, for errors that retrying will not fix
  backTo?: { to: string; label: string };
}

// Errors that may go away by themselves are worth a "Try again" button; a 403 or 404 never will.
const RETRYABLE = new Set(['network', 'timeout', 'server', 'unknown']);

export function ErrorState({ error, onRetry, backTo }: ErrorStateProps) {
  return (
    <Paper role="alert" sx={{ textAlign: 'center', py: 8, px: 2 }}>
      <Box sx={{ color: 'error.main', fontSize: 56, lineHeight: 1, mb: 1 }}>
        <ErrorOutlinedIcon fontSize="inherit" />
      </Box>
      <Typography variant="h3" component="h2" gutterBottom>
        {error.kind === 'forbidden' ? 'Access denied' : error.kind === 'not-found' ? 'Not found' : 'Something went wrong'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {error.message}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
        {onRetry && RETRYABLE.has(error.kind) && (
          <Button variant="contained" onClick={onRetry}>
            Try again
          </Button>
        )}
        {backTo && (
          <Button component={RouterLink} to={backTo.to} variant={onRetry && RETRYABLE.has(error.kind) ? 'outlined' : 'contained'}>
            {backTo.label}
          </Button>
        )}
      </Box>
    </Paper>
  );
}
