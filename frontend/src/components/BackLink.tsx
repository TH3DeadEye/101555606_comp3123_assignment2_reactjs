import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';

// "← Back to employees" above a page title.
export function BackLink({ to = '/employees', children = 'Back to employees' }: { to?: string; children?: string }) {
  return (
    <Button component={RouterLink} to={to} startIcon={<ArrowBackIcon />} sx={{ mb: 1, ml: -1 }}>
      {children}
    </Button>
  );
}
