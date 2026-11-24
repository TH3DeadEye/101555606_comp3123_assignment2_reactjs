import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import Box from '@mui/material/Box';
import { passwordRequirements } from '../utils/validation';

const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

// A checklist that ticks off the password rules while the user types. Colour is
// never the only signal: each line also has an icon and hidden "met" text.
export function PasswordRequirements({ password }: { password: string }) {
  return (
    <Box component="ul" aria-label="Password requirements" sx={{ listStyle: 'none', m: 0, mt: 0.5, p: 0 }}>
      {passwordRequirements(password).map((requirement) => (
        <Box
          component="li"
          key={requirement.id}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: requirement.met ? 'success.dark' : 'text.secondary' }}
        >
          {requirement.met ? <CheckCircleIcon fontSize="inherit" aria-hidden /> : <RadioButtonUncheckedIcon fontSize="inherit" aria-hidden />}
          <span>{requirement.label}</span>
          <Box component="span" sx={srOnly}>
            {requirement.met ? ' (met)' : ' (not met yet)'}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
