import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';

export interface SearchValues {
  department: string;
  position: string;
}

interface EmployeeSearchBarProps {
  values: SearchValues;
  onChange: (values: SearchValues) => void;
  onClear: () => void;
}

// Two boxes, either or both can be filled in. Typing is debounced by the page;
// the search itself is done by the backend.
export function EmployeeSearchBar({ values, onChange, onClear }: EmployeeSearchBarProps) {
  const hasText = values.department.trim() !== '' || values.position.trim() !== '';

  const field = (key: keyof SearchValues, label: string, placeholder: string) => (
    <TextField
      id={`search-${key}`}
      label={label}
      placeholder={placeholder}
      value={values[key]}
      onChange={(event) => onChange({ ...values, [key]: event.target.value })}
      size="small"
      sx={{ flex: '1 1 220px' }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
        htmlInput: { maxLength: 100 },
      }}
    />
  );

  return (
    <Paper component="form" role="search" aria-label="Search employees" onSubmit={(event) => event.preventDefault()} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {field('department', 'Department', 'for example Engineering')}
        {field('position', 'Position', 'for example Developer')}
        <Button type="button" variant="outlined" startIcon={<ClearIcon />} onClick={onClear} disabled={!hasText}>
          Clear search
        </Button>
      </Box>
    </Paper>
  );
}
