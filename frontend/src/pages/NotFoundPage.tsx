import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  usePageTitle('Page not found');

  return (
    <Stack spacing={2} sx={{ py: 6, alignItems: 'flex-start' }}>
      <Typography variant="h1" component="h1">
        Page not found
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button component={RouterLink} to={isAuthenticated ? '/employees' : '/login'} variant="contained">
        {isAuthenticated ? 'Back to employees' : 'Go to log in'}
      </Button>
    </Stack>
  );
}
