import TextField from '@mui/material/TextField';
import type { ReactNode, Ref } from 'react';

export interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  // The validation message. When it is set the field is shown as invalid.
  error?: string | null;
  // A hint shown under the field (it stays visible next to an error)
  hint?: ReactNode;
  type?: 'text' | 'email' | 'date';
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: 'text' | 'decimal' | 'email' | 'numeric';
  maxLength?: number;
  inputRef?: Ref<HTMLInputElement>;
}

// A controlled text field with the same look, labels and error behaviour
// everywhere. The label is always visible (never only a placeholder) and the
// message is tied to the input through aria-describedby by MUI.
export function TextInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  type = 'text',
  required = false,
  disabled = false,
  autoComplete,
  autoFocus,
  inputMode,
  maxLength,
  inputRef,
}: TextInputProps) {
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
      type={type}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      inputRef={inputRef}
      fullWidth
      margin="normal"
      slotProps={{
        // a <div>, so a hint can contain a list
        formHelperText: { component: 'div' },
        htmlInput: { inputMode, maxLength },
        // date inputs always show a value or a format, so the label must not overlap it
        inputLabel: type === 'date' ? { shrink: true } : undefined,
      }}
    />
  );
}
