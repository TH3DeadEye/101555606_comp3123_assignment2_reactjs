import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

// The centred card that holds the login and signup forms.
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper sx={{ maxWidth: 460, mx: 'auto', mt: { xs: 0, sm: 5 }, p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h1" component="h1" sx={{ fontSize: '1.8rem', mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
