import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { signup } from '../api/authApi';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { TextInput } from '../components/TextInput';
import { useFocusFirstInvalid } from '../hooks/useFocusFirstInvalid';
import { usePageTitle } from '../hooks/usePageTitle';
import { toAppError } from '../utils/errors';
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../utils/validation';

type Field = 'username' | 'email' | 'password' | 'confirm';
// The fields the backend knows about. "confirm" only exists in the browser.
const SERVER_FIELDS = ['username', 'email', 'password'] as const;

export default function SignupPage() {
  usePageTitle('Sign up');
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  // Controlled inputs: React state is the single source of truth for every value.
  const [values, setValues] = useState<Record<Field, string>>({ username: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const mutation = useMutation({ mutationFn: signup });

  useFocusFirstInvalid(formRef, attempts);

  const clientErrors = useMemo<Record<Field, string | null>>(
    () => ({
      username: validateUsername(values.username),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirm: validateConfirmPassword(values.password, values.confirm),
    }),
    [values],
  );

  // A message appears once the user has left the field or tried to submit.
  const errorFor = (field: Field): string | null =>
    touched[field] || attempts > 0 ? (clientErrors[field] ?? serverErrors[field] ?? null) : null;

  const setField = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    // editing a field clears what the server said about it
    setServerErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };
  const touch = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setAttempts((count) => count + 1);
    setFormError(null);
    if (Object.values(clientErrors).some(Boolean)) return; // the messages are shown, nothing is sent

    const username = values.username.trim();
    try {
      await mutation.mutateAsync({ username, email: values.email.trim(), password: values.password });
      navigate('/login', { replace: true, state: { registeredUsername: username.toLowerCase() } });
    } catch (error) {
      const appError = toAppError(error);
      const mapped: Partial<Record<Field, string>> = {};
      for (const field of SERVER_FIELDS) {
        const message = appError.fieldErrors[field]?.[0];
        if (message) mapped[field] = message;
      }
      setServerErrors(mapped);
      // Anything that cannot be shown next to a field (rate limit, network
      // problem, server error) goes into the alert above the button.
      setFormError(Object.keys(mapped).length > 0 ? null : appError.message);
      setAttempts((count) => count + 1);
    }
  };

  return (
    <AuthCard title="Sign up">
      <Typography color="text.secondary">Create an account to manage your own employees.</Typography>

      <Box component="form" ref={formRef} onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextInput
          id="signup-username"
          label="Username"
          value={values.username}
          onChange={(value) => setField('username', value)}
          onBlur={() => touch('username')}
          error={errorFor('username')}
          hint="3 to 30 letters, numbers, dots, underscores or hyphens"
          autoComplete="username"
          required
          disabled={mutation.isPending}
        />
        <TextInput
          id="signup-email"
          label="Email"
          type="email"
          value={values.email}
          onChange={(value) => setField('email', value)}
          onBlur={() => touch('email')}
          error={errorFor('email')}
          autoComplete="email"
          required
          disabled={mutation.isPending}
        />
        <PasswordField
          id="signup-password"
          label="Password"
          value={values.password}
          onChange={(value) => setField('password', value)}
          onBlur={() => touch('password')}
          error={errorFor('password')}
          hint={<PasswordRequirements password={values.password} />}
          autoComplete="new-password"
          disabled={mutation.isPending}
        />
        <PasswordField
          id="signup-confirm"
          label="Confirm password"
          value={values.confirm}
          onChange={(value) => setField('confirm', value)}
          onBlur={() => touch('confirm')}
          error={errorFor('confirm')}
          autoComplete="new-password"
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
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </Box>

      <Typography sx={{ mt: 3, textAlign: 'center' }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/login">
          Log in
        </Link>
      </Typography>
    </AuthCard>
  );
}
