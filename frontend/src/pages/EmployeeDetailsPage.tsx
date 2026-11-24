import Typography from '@mui/material/Typography';
import { usePageTitle } from '../hooks/usePageTitle';

export default function EmployeeDetailsPage() {
  usePageTitle('Employee details');
  return (
    <Typography variant="h1" component="h1">
      Employee details
    </Typography>
  );
}
