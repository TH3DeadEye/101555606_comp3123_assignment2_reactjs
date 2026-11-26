import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmployeeInput } from '../api/types';
import { BackLink } from '../components/BackLink';
import { EmployeeForm } from '../components/EmployeeForm';
import { useCreateEmployee } from '../hooks/useEmployees';
import { useNotify } from '../hooks/useNotify';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';
import { fullName } from '../utils/format';

export default function AddEmployeePage() {
  usePageTitle('Add employee');
  const navigate = useNavigate();
  const notify = useNotify();
  const create = useCreateEmployee();

  // The form recognises a NEW error by its identity, so the mapped error must
  // stay the same object until the mutation fails again.
  const serverError = useMemo(() => (create.error ? toAppError(create.error) : null), [create.error]);

  const handleSubmit = async (input: EmployeeInput, picture: File | null) => {
    try {
      const employee = await create.mutateAsync({ input, picture });
      notify.success(`${fullName(employee)} was added.`);
      navigate('/employees');
    } catch {
      // Nothing to do here: the error is shown by the form.
    }
  };

  return (
    <>
      <BackLink />
      <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
        Add employee
      </Typography>
      <Paper sx={{ p: { xs: 2, sm: 4 }, maxWidth: 820 }}>
        <EmployeeForm
          submitLabel="Add employee"
          isSubmitting={create.isPending}
          serverError={serverError}
          onSubmit={(input, picture) => void handleSubmit(input, picture)}
          onCancel={() => navigate('/employees')}
        />
      </Paper>
    </>
  );
}
