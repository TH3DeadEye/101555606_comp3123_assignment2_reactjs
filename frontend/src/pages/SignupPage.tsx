import Typography from '@mui/material/Typography';
import { usePageTitle } from '../hooks/usePageTitle';

export default function SignupPage() {
  usePageTitle('Sign up');
  return (
    <Typography variant="h1" component="h1">
      Sign up
    </Typography>
  );
}
