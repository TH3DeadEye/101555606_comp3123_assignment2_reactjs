import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState, type SyntheticEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import type { LoginPayload } from '../api/types';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { TextInput } from '../components/TextInput';
import { useAuth } from '../hooks/useAuth';
import { useFocusFirstInvalid } from '../hooks/useFocusFirstInvalid';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';
import { buildLoginPayload, validateLoginIdentifier, validateLoginPassword } from '../utils/validation';

type Field = 'identifier' | 'password';

const SESSION_NOTICES = {
  expired: 'Your session has expired. Please log in again.',
  invalid: 'Your session is no longer valid. Please log in again.',
} as const;

export default function LoginPage() {
  usePageTitle('Log in');
  const auth = useAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  // Signup sends the new username along, so the user only has to type a password.
  const registeredUsername = (useLocation().state as { registeredUsername?: string } | null)?.registeredUsername;

  const [values, setValues] = useState<Record<Field, string>>({ identifier: registeredUsername ?? '', password: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const mutation = useMutation({ mutationFn: (payload: LoginPayload) => auth.login(payload) });

  useFocusFirstInvalid(formRef, attempts);

  const clientErrors: Record<Field, string | null> = {
    identifier: validateLoginIdentifier(values.identifier),
    password: validateLoginPassword(values.password),
  };
  const errorFor = (field: Field): string | null =>
    touched[field] || attempts > 0 ? (clientErrors[field] ?? serverErrors[field] ?? null) : null;

  const setField = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };
  const touch = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setAttempts((count) => count + 1);
    setFormError(null);
    if (Object.values(clientErrors).some(Boolean)) return;

    try {
      await mutation.mutateAsync(buildLoginPayload(values.identifier, values.password));
      navigate('/employees', { replace: true });
    } catch (error) {
      const appError = toAppError(error);
      const mapped: Partial<Record<Field, string>> = {};
      const identifierMessage = appError.fieldErrors.username?.[0] ?? appError.fieldErrors.email?.[0];
      if (identifierMessage) mapped.identifier = identifierMessage;
      if (appError.fieldErrors.password?.[0]) mapped.password = appError.fieldErrors.password[0];
      setServerErrors(mapped);
      // A wrong password is deliberately not pinned to one field: the message
      // must not reveal whether the username or the password was the problem.
      setFormError(Object.keys(mapped).length > 0 ? null : appError.message);
      setAttempts((count) => count + 1);
    }
  };

  return (
    <AuthCard title="Log in">
      {registeredUsername && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Your account has been created. Log in to get started.
        </Alert>
      )}
      {auth.sessionNotice && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {SESSION_NOTICES[auth.sessionNotice]}
        </Alert>
      )}

      <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate>
        <TextInput
          id="login-identifier"
          label="Username or email"
          value={values.identifier}
          onChange={(value) => setField('identifier', value)}
          onBlur={() => touch('identifier')}
          error={errorFor('identifier')}
          autoComplete="username"
          required
          autoFocus={!registeredUsername}
          disabled={mutation.isPending}
        />
        <PasswordField
          id="login-password"
          label="Password"
          value={values.password}
          onChange={(value) => setField('password', value)}
          onBlur={() => touch('password')}
          error={errorFor('password')}
          autoComplete="current-password"
          disabled={mutation.isPending}
        />

        {formError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {formError}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ mt: 2 }}
        >
          {mutation.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </Box>

      <Typography sx={{ mt: 3, textAlign: 'center' }}>
        New here?{' '}
        <Link component={RouterLink} to="/signup">
          Create an account
        </Link>
      </Typography>
    </AuthCard>
  );
}
