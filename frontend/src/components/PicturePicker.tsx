import PersonIcon from '@mui/icons-material/Person';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useRef, type ChangeEvent } from 'react';
import { useImagePreview } from '../hooks/useImagePreview';
import { PICTURE_TYPES } from '../utils/employeeValidation';
import { resolvePictureUrl } from '../utils/format';

interface PicturePickerProps {
  // A newly chosen picture that passed validation (the form clears it when it did not)
  file: File | null;
  // Called with the chosen file as it is, or with null when the user removes it.
  // The form decides whether the file is acceptable.
  onPick: (file: File | null) => void;
  // The picture stored for this employee, when editing
  currentPicture?: string | null;
  personName?: string;
  error?: string | null;
  disabled?: boolean;
}

export function PicturePicker({ file, onPick, currentPicture, personName, error, disabled = false }: PicturePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const errorId = useId();
  const preview = useImagePreview(file);
  const stored = resolvePictureUrl(currentPicture);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // Empty the input, so choosing the same file again still triggers a change.
    event.target.value = '';
    if (picked) onPick(picked);
  };

  const shown = preview ?? stored;
  const alt = preview ? 'Preview of the chosen picture' : stored ? `Current picture of ${personName ?? 'this employee'}` : '';

  return (
    <Box role="group" aria-labelledby={labelId} sx={{ mt: 2 }}>
      <Typography id={labelId} variant="subtitle2" component="div" sx={{ mb: 1 }}>
        Profile picture (optional)
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
        <Avatar src={shown ?? undefined} alt={alt} variant="rounded" sx={{ width: 96, height: 96, bgcolor: 'grey.300', color: 'grey.600' }}>
          <PersonIcon sx={{ fontSize: 60 }} />
        </Avatar>

        <Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => inputRef.current?.click()} disabled={disabled}>
              {preview || stored ? 'Change picture' : 'Choose picture'}
            </Button>
            {file && (
              <Button color="inherit" onClick={() => onPick(null)} disabled={disabled}>
                Remove selected picture
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            JPEG, PNG or WebP, up to 2 MB.
          </Typography>
          {error && (
            <Typography id={errorId} role="alert" variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* The real file input stays hidden: the button above opens it. */}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={PICTURE_TYPES.join(',')}
        aria-label="Profile picture file"
        aria-describedby={error ? errorId : undefined}
        onChange={handleChange}
      />
    </Box>
  );
}
