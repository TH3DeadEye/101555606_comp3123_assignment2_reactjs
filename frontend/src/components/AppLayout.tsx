import Container from '@mui/material/Container';
import { Outlet } from 'react-router-dom';

// The frame around every page.
export function AppLayout() {
  return (
    <Container component="main" id="main-content" maxWidth="lg" sx={{ py: 4 }}>
      <Outlet />
    </Container>
  );
}
