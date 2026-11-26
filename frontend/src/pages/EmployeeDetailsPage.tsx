import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmployeeAvatar } from '../components/EmployeeAvatar';
import { ErrorState, LoadingState } from '../components/StateMessages';
import { useDeleteEmployee, useEmployee } from '../hooks/useEmployees';
import { useNotify } from '../hooks/useNotify';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';
import { formatDate, formatDateTime, formatSalary, fullName } from '../utils/format';

// One "label: value" pair of the details list.
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'contents' }}>
      <Typography component="dt" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function EmployeeDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const query = useEmployee(id);
  const remove = useDeleteEmployee();
  const employee = query.data;

  usePageTitle(employee ? fullName(employee) : 'Employee details');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!employee) return;
    try {
      await remove.mutateAsync(employee._id);
      notify.success(`${fullName(employee)} was deleted.`);
      navigate('/employees', { replace: true });
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'not-found' || appError.kind === 'forbidden') {
        notify.error(appError.message); // already gone: nothing left to delete here
        navigate('/employees', { replace: true });
      } else {
        setDeleteError(appError.message); // stay open so the user can try again
      }
    }
  };

  if (query.isPending) {
    return (
      <>
        <BackLink />
        <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
          Employee details
        </Typography>
        <LoadingState label="Loading employee…" />
      </>
    );
  }

  if (!employee) {
    // 403 (it belongs to another user) and 404 (it does not exist) end up here
    return (
      <>
        <BackLink />
        <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
          Employee details
        </Typography>
        <ErrorState
          error={toAppError(query.error)}
          onRetry={() => void query.refetch()}
          backTo={{ to: '/employees', label: 'Back to employees' }}
        />
      </>
    );
  }

  const name = fullName(employee);

  return (
    <>
      <BackLink />
      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 5 }}>
          <Box sx={{ alignSelf: { xs: 'center', sm: 'flex-start' } }}>
            <EmployeeAvatar employee={employee} size={160} />
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
              {name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 3, flexWrap: 'wrap', gap: 1 }}>
              <Chip label={employee.position} color="primary" variant="outlined" />
              <Chip label={employee.department} variant="outlined" />
            </Stack>

            <Box
              component="dl"
              sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '11rem 1fr' }, columnGap: 2, rowGap: { xs: 0.5, sm: 1.5 } }}
            >
              <Detail label="Email">
                <Link href={`mailto:${employee.email}`}>{employee.email}</Link>
              </Detail>
              <Detail label="Salary">{formatSalary(employee.salary)}</Detail>
              <Detail label="Date of joining">{formatDate(employee.date_of_joining)}</Detail>
              <Detail label="Added">{formatDateTime(employee.created_at)}</Detail>
              <Detail label="Last updated">{formatDateTime(employee.updated_at)}</Detail>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ mt: 4, flexWrap: 'wrap', gap: 1.5 }}>
              <Button component={RouterLink} to={`/employees/${employee._id}/edit`} variant="contained" startIcon={<EditIcon />}>
                Edit
              </Button>
              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  remove.reset();
                  setDeleteError(null);
                  setDialogOpen(true);
                }}
              >
                Delete
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={dialogOpen}
        title={`Delete ${name}?`}
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
