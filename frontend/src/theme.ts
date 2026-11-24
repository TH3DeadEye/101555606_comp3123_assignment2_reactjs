import { createTheme } from '@mui/material/styles';

// The system font stack avoids downloading a web font (no third-party request).
const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' }, // contrast ratio 5.7:1 on white (WCAG AA)
    secondary: { main: '#00796b' },
    background: { default: '#f4f6fa' },
  },
  typography: {
    fontFamily,
    h1: { fontSize: '2rem', fontWeight: 700 },
    h2: { fontSize: '1.6rem', fontWeight: 700 },
    h3: { fontSize: '1.35rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #e0e5ee' } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});
