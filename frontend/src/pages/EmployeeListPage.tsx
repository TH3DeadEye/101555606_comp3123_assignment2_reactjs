import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { Employee } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmployeeSearchBar, type SearchValues } from '../components/EmployeeSearchBar';
import { EmployeeTable, EmployeeTableSkeleton } from '../components/EmployeeTable';
import { EmptyState, ErrorState } from '../components/StateMessages';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { cleanSearch, useDeleteEmployee, useEmployees } from '../hooks/useEmployees';
import { useNotify } from '../hooks/useNotify';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';
import { fullName } from '../utils/format';

// How long the user must pause typing before the search is sent.
const SEARCH_DELAY_MS = 350;
const NO_SEARCH: SearchValues = { department: '', position: '' };

export default function EmployeeListPage() {
  usePageTitle('Employees');
  const notify = useNotify();
  const remove = useDeleteEmployee();

  // ---- Search -------------------------------------------------------------
  const [inputs, setInputs] = useState<SearchValues>(NO_SEARCH);
  const debounced = useDebouncedValue(inputs, SEARCH_DELAY_MS);
  const inputsBlank = !inputs.department.trim() && !inputs.position.trim();
  // Typing waits for a pause, but emptying the boxes shows the full list at once.
  const terms = cleanSearch(inputsBlank ? inputs : debounced);
  const isSearching = Object.keys(terms).length > 0;
  // The search is done by the backend (GET /emp/employees/search), not here.
  const query = useEmployees(terms);

  // ---- Delete (with confirmation) -----------------------------------------
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

  // ---- What to show -------------------------------------------------------
  const count = query.data?.length ?? 0;
  // The search bar stays while there is something to search or the user is using it
  // (so a search without results does not take the bar away).
  const showSearch = !inputsBlank || isSearching || count > 0;

  const addButton = (
    <Button component={RouterLink} to="/employees/add" variant="contained" startIcon={<AddIcon />}>
      Add employee
    </Button>
  );

  let content;
  if (query.isPending) {
    content = <EmployeeTableSkeleton />;
  } else if (query.data === undefined) {
    // The request failed and there is nothing older to show.
    content = <ErrorState error={toAppError(query.error)} onRetry={() => void query.refetch()} />;
  } else if (query.data.length === 0 && isSearching) {
    content = (
      <EmptyState
        icon={<SearchOffIcon fontSize="inherit" />}
        title="No employees match your search"
        message="Try a different department or position."
        action={
          <Button variant="outlined" onClick={() => setInputs(NO_SEARCH)}>
            Show all employees
          </Button>
        }
      />
    );
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
        {/* While the next search loads, the previous rows stay visible but dimmed */}
        <Box aria-busy={query.isPlaceholderData} sx={{ opacity: query.isPlaceholderData ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <EmployeeTable employees={query.data} onDelete={askToDelete} deletingId={remove.isPending ? (target?._id ?? null) : null} />
        </Box>
      </>
    );
  }

  const summary = isSearching
    ? `${count} ${count === 1 ? 'employee matches' : 'employees match'} your search`
    : `${count} ${count === 1 ? 'employee' : 'employees'}`;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h1" component="h1">
            Employees
          </Typography>
          {query.data && showSearch && (
            <Typography color="text.secondary" aria-live="polite">
              {summary}
            </Typography>
          )}
        </Box>
        {showSearch && addButton}
      </Box>

      {showSearch && <EmployeeSearchBar values={inputs} onChange={setInputs} onClear={() => setInputs(NO_SEARCH)} />}
      <Box sx={{ height: 4, mb: 1 }}>{query.isFetching && !query.isPending && <LinearProgress aria-label="Loading results" />}</Box>

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
