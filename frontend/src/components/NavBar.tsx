import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotify } from '../hooks/useNotify';

// The link of the current page is highlighted (NavLink adds the "active" class
// and aria-current="page" by itself). The highlight is DARKER than the bar: a
// lighter one would leave the white text with only 4:1 contrast, below the 4.5:1
// that WCAG AA requires (found with the axe accessibility audit).
const linkSx = {
  color: 'inherit',
  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
  '&.active': { bgcolor: 'primary.dark' },
} as const;

export function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const closeMenu = () => setMenuAnchor(null);

  const handleLogout = () => {
    closeMenu();
    logout(); // clears the token, the user and every cached employee
    navigate('/login', { replace: true });
    notify.info('You have been logged out.');
  };

  return (
    <AppBar position="static" elevation={0}>
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 } }}>
        <Toolbar disableGutters sx={{ gap: 1 }}>
          <PeopleIcon aria-hidden sx={{ ml: { xs: 1, sm: 0 } }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to={isAuthenticated ? '/employees' : '/login'}
            sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, flexGrow: { xs: 1, sm: 0 }, mr: { sm: 3 } }}
          >
            Employee Management App
          </Typography>

          {/* Wide screens: links in the bar */}
          <Box component="nav" aria-label="Main" sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5, flexGrow: 1 }}>
            {isAuthenticated ? (
              <>
                <Button component={NavLink} to="/employees" end sx={linkSx}>
                  Employees
                </Button>
                <Button component={NavLink} to="/employees/add" sx={linkSx}>
                  Add employee
                </Button>
              </>
            ) : (
              <>
                <Button component={NavLink} to="/login" sx={linkSx}>
                  Log in
                </Button>
                <Button component={NavLink} to="/signup" sx={linkSx}>
                  Sign up
                </Button>
              </>
            )}
          </Box>

          {isAuthenticated && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2">
                Signed in as <strong>{user?.username}</strong>
              </Typography>
              <Button color="inherit" variant="outlined" startIcon={<LogoutIcon />} onClick={handleLogout}>
                Log out
              </Button>
            </Box>
          )}

          {/* Narrow screens: the same links in a menu */}
          <IconButton
            color="inherit"
            aria-label="Open menu"
            aria-haspopup="true"
            aria-expanded={menuAnchor ? 'true' : undefined}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          {/* disablePortal keeps the menu inside the header, so it belongs to a page landmark */}
          <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={closeMenu} slotProps={{ root: { disablePortal: true } }}>
            {isAuthenticated
              ? [
                  <MenuItem key="who" disabled>
                    Signed in as {user?.username}
                  </MenuItem>,
                  <MenuItem key="list" component={RouterLink} to="/employees" onClick={closeMenu}>
                    Employees
                  </MenuItem>,
                  <MenuItem key="add" component={RouterLink} to="/employees/add" onClick={closeMenu}>
                    Add employee
                  </MenuItem>,
                  <MenuItem key="logout" onClick={handleLogout}>
                    Log out
                  </MenuItem>,
                ]
              : [
                  <MenuItem key="login" component={RouterLink} to="/login" onClick={closeMenu}>
                    Log in
                  </MenuItem>,
                  <MenuItem key="signup" component={RouterLink} to="/signup" onClick={closeMenu}>
                    Sign up
                  </MenuItem>,
                ]}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
