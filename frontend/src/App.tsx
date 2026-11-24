import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export default function App() {
  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div">
            Employee Management App
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ py: 4 }}>
        <Typography variant="h1" gutterBottom>
          Welcome
        </Typography>
        <Typography>The employee screens are coming next.</Typography>
      </Container>
    </>
  );
}
