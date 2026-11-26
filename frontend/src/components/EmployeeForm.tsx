import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import { useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type { Employee, EmployeeInput } from '../api/types';
import { useFocusFirstInvalid } from '../hooks/useFocusFirstInvalid';
import type { AppError } from '../utils/errors';
import { validateEmployeeInput, validatePicture } from '../utils/employeeValidation';
import { fullName, toDateInputValue } from '../utils/format';
import { PicturePicker } from './PicturePicker';
import { TextInput } from './TextInput';

type Field = keyof EmployeeInput;
type Touchable = Field | 'profile_picture';

const EMPTY: EmployeeInput = {
  first_name: '',
  last_name: '',
  email: '',
  position: '',
  department: '',
  salary: '',
  date_of_joining: '',
};

function valuesFrom(employee?: Employee): EmployeeInput {
  if (!employee) return EMPTY;
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    position: employee.position,
    department: employee.department,
    salary: String(employee.salary),
    date_of_joining: toDateInputValue(employee.date_of_joining),
  };
}

// The names the backend uses for the fields it can complain about.
const KNOWN_FIELDS = new Set<string>([...Object.keys(EMPTY), 'profile_picture']);

interface EmployeeFormProps {
  // Present when editing: the form starts with this employee's values
  initial?: Employee;
  submitLabel: string;
  isSubmitting: boolean;
  // What went wrong with the last save, if anything
  serverError: AppError | null;
  onSubmit: (input: EmployeeInput, picture: File | null) => void;
  onCancel: () => void;
}

export function EmployeeForm({ initial, submitLabel, isSubmitting, serverError, onSubmit, onCancel }: EmployeeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Controlled inputs: this state is the single source of truth for every value.
  const [values, setValues] = useState<EmployeeInput>(() => valuesFrom(initial));
  const [touched, setTouched] = useState<Partial<Record<Touchable, boolean>>>({});
  const [picture, setPicture] = useState<File | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Messages from the backend disappear for a field as soon as it is edited.
  // They also reset when a new error arrives ("adjust state while rendering",
  // the pattern React documents for reacting to a changed prop).
  const [edited, setEdited] = useState<Partial<Record<Touchable, boolean>>>({});
  const [seenError, setSeenError] = useState<AppError | null>(null);
  if (serverError !== seenError) {
    setSeenError(serverError);
    setEdited({});
    if (serverError) setAttempts((count) => count + 1); // also moves the focus to the first problem
  }

  useFocusFirstInvalid(formRef, attempts);

  const clientErrors = useMemo(() => validateEmployeeInput(values), [values]);

  const serverMessage = (field: Touchable): string | undefined =>
    edited[field] ? undefined : serverError?.fieldErrors[field]?.[0];

  const errorFor = (field: Field): string | null =>
    (touched[field] || attempts > 0 ? clientErrors[field] : undefined) ?? serverMessage(field) ?? null;

  const pictureProblem = pictureError ?? serverMessage('profile_picture') ?? null;

  const setField = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setEdited((current) => ({ ...current, [field]: true }));
  };
  const touch = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));

  const handlePick = (file: File | null) => {
    setEdited((current) => ({ ...current, profile_picture: true }));
    if (file === null) {
      setPicture(null);
      setPictureError(null);
      return;
    }
    const message = validatePicture(file);
    if (message) {
      setPictureError(message); // the new choice is refused; an earlier valid one stays
      return;
    }
    setPicture(file);
    setPictureError(null);
  };

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    setAttempts((count) => count + 1);
    if (Object.keys(clientErrors).length > 0) return; // the messages are shown, nothing is sent
    onSubmit(values, picture);
  };

  // A problem with no field of its own (network failure, rate limit, server error)
  // is shown above the buttons.
  const showFormError =
    serverError !== null && !Object.keys(serverError.fieldErrors).some((field) => KNOWN_FIELDS.has(field));

  const input = (field: Field, label: string, extra: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <TextInput
      id={`employee-${field}`}
      label={label}
      value={values[field]}
      onChange={(value) => setField(field, value)}
      onBlur={() => touch(field)}
      error={errorFor(field)}
      required
      margin="none"
      disabled={isSubmitting}
      {...extra}
    />
  );

  return (
    <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>{input('first_name', 'First name', { autoComplete: 'given-name', maxLength: 50 })}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{input('last_name', 'Last name', { autoComplete: 'family-name', maxLength: 50 })}</Grid>
        <Grid size={12}>{input('email', 'Email', { type: 'email', autoComplete: 'off', inputMode: 'email', maxLength: 254 })}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{input('position', 'Position', { maxLength: 100 })}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{input('department', 'Department', { maxLength: 100 })}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {input('salary', 'Salary', { inputMode: 'decimal', hint: 'Yearly, in dollars: 55000 or 55000.50' })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{input('date_of_joining', 'Date of joining', { type: 'date' })}</Grid>
        <Grid size={12}>
          <PicturePicker
            file={picture}
            onPick={handlePick}
            currentPicture={initial?.profile_picture}
            personName={initial ? fullName(initial) : undefined}
            error={pictureProblem}
            disabled={isSubmitting}
          />
        </Grid>
      </Grid>

      {showFormError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {serverError.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap', mt: 3 }}>
        <Button onClick={onCancel} disabled={isSubmitting} color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </Box>
    </Box>
  );
}
