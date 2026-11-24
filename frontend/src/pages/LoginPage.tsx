import Typography from '@mui/material/Typography';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('Log in');
  return (
    <Typography variant="h1" component="h1">
      Log in
    </Typography>
  );
}
