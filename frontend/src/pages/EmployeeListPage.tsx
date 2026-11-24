import Typography from '@mui/material/Typography';
import { usePageTitle } from '../hooks/usePageTitle';

export default function EmployeeListPage() {
  usePageTitle('Employees');
  return (
    <Typography variant="h1" component="h1">
      Employees
    </Typography>
  );
}
