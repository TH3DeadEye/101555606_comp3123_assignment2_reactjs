import Typography from '@mui/material/Typography';
import { usePageTitle } from '../hooks/usePageTitle';

export default function AddEmployeePage() {
  usePageTitle('Add employee');
  return (
    <Typography variant="h1" component="h1">
      Add employee
    </Typography>
  );
}
