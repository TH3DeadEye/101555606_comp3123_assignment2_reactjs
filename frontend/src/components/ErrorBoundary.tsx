import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  failed: boolean;
}

// The last line of defence: if a screen crashes while it is being drawn (a bug,
// not a failed request: those are handled where they happen), the user sees this
// message instead of a blank page. It sits above the router, so it works
// without any router hooks.
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Only the message and the failing component go to the console: never data
    // from the session or from forms.
    console.error('The page crashed while rendering:', error.message, info.componentStack?.split('\n')[1]?.trim());
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
        <Paper role="alert" sx={{ maxWidth: 480, p: 4, textAlign: 'center' }}>
          <Typography variant="h1" component="h1" sx={{ fontSize: '1.6rem', mb: 1.5 }}>
            Something went wrong
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>
            This page could not be displayed. Reloading usually fixes it. Your data is safe.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload page
            </Button>
            <Button variant="outlined" href="/">
              Go to the start page
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}
