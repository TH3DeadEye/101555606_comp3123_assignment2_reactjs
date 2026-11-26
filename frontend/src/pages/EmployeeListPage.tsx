import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { Employee } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmployeeTable, EmployeeTableSkeleton } from '../components/EmployeeTable';
import { EmptyState, ErrorState } from '../components/StateMessages';
import { useDeleteEmployee, useEmployees } from '../hooks/useEmployees';
import { useNotify } from '../hooks/useNotify';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';
import { fullName } from '../utils/format';

export default function EmployeeListPage() {
  usePageTitle('Employees');
  const query = useEmployees();
  const notify = useNotify();
  const remove = useDeleteEmployee();

  // The employee the user clicked "Delete" for. It is kept after the dialog
  // closes so the text does not change while the dialog fades out.
  const [target, setTarget] = useState<Employee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const askToDelete = (employee: Employee) => {
    remove.reset();
    setDeleteError(null);
    setTarget(employee);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!target) return;
    try {
      await remove.mutateAsync(target._id);
      notify.success(`${fullName(target)} was deleted.`);
      setDialogOpen(false);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'not-found' || appError.kind === 'forbidden') {
        // Already deleted somewhere else, or not theirs: there is nothing left to confirm.
        notify.error(appError.message);
        setDialogOpen(false);
      } else {
        setDeleteError(appError.message); // stay open so the user can try again
      }
    }
  };

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
        <EmployeeTable employees={query.data} onDelete={askToDelete} deletingId={remove.isPending ? (target?._id ?? null) : null} />
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

      <ConfirmDialog
        open={dialogOpen}
        title={target ? `Delete ${fullName(target)}?` : 'Delete employee?'}
        message="This permanently removes the employee and their profile picture. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDialogOpen(false)}
        busy={remove.isPending}
        error={deleteError}
      />
    </>
  );
}
