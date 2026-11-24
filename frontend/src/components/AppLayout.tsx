import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';

// The frame around every page: skip link, navigation bar and the main area.
export function AppLayout() {
  return (
    <>
      {/* Lets keyboard users jump over the navigation. Visible only when focused. */}
      <Link
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          top: 8,
          zIndex: 2000,
          bgcolor: 'background.paper',
          p: 1.5,
          borderRadius: 1,
          '&:focus': { left: 8 },
        }}
      >
        Skip to main content
      </Link>
      <NavBar />
      <Container component="main" id="main-content" tabIndex={-1} maxWidth="lg" sx={{ py: 4, outline: 'none' }}>
        <Outlet />
      </Container>
    </>
  );
}
