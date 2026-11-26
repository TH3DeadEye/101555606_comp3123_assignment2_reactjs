import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { EmployeeTable, EmployeeTableSkeleton } from '../components/EmployeeTable';
import { EmptyState, ErrorState } from '../components/StateMessages';
import { useEmployees } from '../hooks/useEmployees';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';

export default function EmployeeListPage() {
  usePageTitle('Employees');
  const query = useEmployees();

  const addButton = (
    <Button component={RouterLink} to="/employees/add" variant="contained" startIcon={<AddIcon />}>
      Add employee
    </Button>
  );

  let content;
  if (query.isPending) {
    content = <EmployeeTableSkeleton />;
  } else if (query.data === undefined) {
    // The first load failed, so there is nothing to show but the error.
    content = <ErrorState error={toAppError(query.error)} onRetry={() => void query.refetch()} />;
  } else if (query.data.length === 0) {
    content = (
      <EmptyState
        icon={<GroupIcon fontSize="inherit" />}
        title="No employees yet"
        message="Add your first employee to get started."
        action={addButton}
      />
    );
  } else {
    content = (
      <>
        {query.isError && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          >
            The list could not be refreshed: {toAppError(query.error).message}
          </Alert>
        )}
        <EmployeeTable employees={query.data} onDelete={() => undefined} />
      </>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h1" component="h1">
            Employees
          </Typography>
          {query.data && query.data.length > 0 && (
            <Typography color="text.secondary" aria-live="polite">
              {query.data.length} {query.data.length === 1 ? 'employee' : 'employees'}
            </Typography>
          )}
        </Box>
        {query.data && query.data.length > 0 && addButton}
      </Box>

      {content}
    </>
  );
}
