import Typography from '@mui/material/Typography';
import { usePageTitle } from '../hooks/usePageTitle';

export default function EditEmployeePage() {
  usePageTitle('Edit employee');
  return (
    <Typography variant="h1" component="h1">
      Edit employee
    </Typography>
  );
}
