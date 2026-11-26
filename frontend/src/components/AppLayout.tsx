import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavBar } from './NavBar';
import { LoadingState } from './StateMessages';

// The frame around every page: skip link, navigation bar and the main area.
export function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const lastPath = useRef(pathname);

  // After the user navigates to another page, start at its top: scroll up and
  // move the keyboard focus into the main area. Without this, keyboard and
  // screen-reader users stay on the link they clicked (which no longer exists).
  // The first page load is left alone, and so is React's double effect in development.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

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
      <Container component="main" id="main-content" ref={mainRef} tabIndex={-1} maxWidth="lg" sx={{ py: 4, outline: 'none' }}>
        {/* Pages are loaded on demand, so the bar stays while the next one arrives */}
        <Suspense fallback={<LoadingState label="Loading…" />}>
          <Outlet />
        </Suspense>
      </Container>
    </>
  );
}
