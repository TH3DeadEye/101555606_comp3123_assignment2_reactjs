import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useState, type ReactNode } from 'react';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  hint?: ReactNode;
  // "new-password" lets password managers offer a generated one on sign-up
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
}

// A password input with a button that shows or hides what was typed.
export function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete,
  disabled = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const helper =
    error && hint ? (
      <>
        <span>{error}</span>
        {hint}
      </>
    ) : (
      (error ?? hint)
    );

  return (
    <TextField
      id={id}
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      error={Boolean(error)}
      helperText={helper}
      type={visible ? 'text' : 'password'}
      required
      disabled={disabled}
      autoComplete={autoComplete}
      fullWidth
      margin="normal"
      slotProps={{
        formHelperText: { component: 'div' },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                onClick={() => setVisible((current) => !current)}
                // keep the focus in the input when the button is pressed with the mouse
                onMouseDown={(event) => event.preventDefault()}
                disabled={disabled}
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
