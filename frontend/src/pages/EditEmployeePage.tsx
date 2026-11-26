import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { EmployeeInput } from '../api/types';
import { BackLink } from '../components/BackLink';
import { EmployeeForm } from '../components/EmployeeForm';
import { ErrorState, LoadingState } from '../components/StateMessages';
import { useEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { useNotify } from '../hooks/useNotify';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';

export default function EditEmployeePage() {
  const { id = '' } = useParams();
  usePageTitle('Edit employee');
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const query = useEmployee(id);
  const update = useUpdateEmployee(id);

  // The form recognises a NEW error by its identity, so the mapped error must
  // stay the same object until the mutation fails again.
  const serverError = useMemo(() => (update.error ? toAppError(update.error) : null), [update.error]);

  const handleSubmit = async (input: EmployeeInput, picture: File | null) => {
    try {
      await update.mutateAsync({ input, picture });
      notify.success('Changes saved.');
      navigate('/employees');
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'not-found' || appError.kind === 'forbidden') {
        // Deleted in the meantime, or not theirs: editing cannot fix that.
        notify.error(appError.message);
        navigate('/employees');
      }
      // Anything else is shown by the form, so the user can correct it and save again.
    }
  };

  // Back to wherever the user came from (the list or the details page). When the
  // page was opened directly there is nothing to go back to, so use the list.
  const cancel = () => (location.key === 'default' ? navigate('/employees') : navigate(-1));

  const heading = (
    <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
      Edit employee
    </Typography>
  );

  if (query.isPending) {
    return (
      <>
        <BackLink />
        {heading}
        <LoadingState label="Loading employee…" />
      </>
    );
  }

  if (!query.data) {
    // 403 (it belongs to another user) and 404 (it does not exist) end up here
    return (
      <>
        <BackLink />
        {heading}
        <ErrorState
          error={toAppError(query.error)}
          onRetry={() => void query.refetch()}
          backTo={{ to: '/employees', label: 'Back to employees' }}
        />
      </>
    );
  }

  return (
    <>
      <BackLink />
      {heading}
      <Paper sx={{ p: { xs: 2, sm: 4 }, maxWidth: 820 }}>
        {/* key: a different employee gets a fresh form, a background refresh does not reset what the user typed */}
        <EmployeeForm
          key={query.data._id}
          initial={query.data}
          submitLabel="Save changes"
          isSubmitting={update.isPending}
          serverError={serverError}
          onSubmit={(input, picture) => void handleSubmit(input, picture)}
          onCancel={cancel}
        />
      </Paper>
    </>
  );
}
