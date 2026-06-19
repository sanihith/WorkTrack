import { useState, useEffect } from 'react';
import { 
  Button, 
  Container, 
  Box, 
  Typography, 
  Stack, 
  Divider, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  Chip, 
  CircularProgress,
  Fade,
  Paper
} from '@mui/material';
import { 
  Microsoft as MicrosoftIcon, 
  Terminal as TerminalIcon 
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import logo from '../assets/logo.jpeg';

const LoginPage = () => {
  const { login, teamsLogin, setToken } = useAuth();
  const [devMode, setDevMode] = useState(false);
  const [devUsers, setDevUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (devMode && devUsers.length === 0) {
      apiClient.get('/auth/dev-users').then(res => setDevUsers(res.data));
    }
  }, [devMode]);

  const handleDevLogin = async (userId: number) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/dev-login', { userId });
      setToken(res.data.token);
      window.location.href = '/dashboard';
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundImage: 'url("/login-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          zIndex: 1
        }
      }}
    >
      <Fade in timeout={1000}>
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 2 }}>
          <Paper 
            elevation={24}
            sx={{ 
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
          >
            <Box 
              component="img" 
              src={logo} 
              alt="WorkTrack Logo" 
              sx={{ height: 60, mb: 3 }} 
            />
            
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-h)' }} gutterBottom>
              WorkTrack
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
              The modern standard for task management.
            </Typography>

            <Stack spacing={2.5}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={teamsLogin}
                startIcon={<MicrosoftIcon />}
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  backgroundColor: '#5B5FC7',
                  textTransform: 'none',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#4E52B1' }
                }}
              >
                Sign in with Teams
              </Button>
              
              <Divider sx={{ my: 1, typography: 'caption', color: 'text.secondary' }}>
                POWERED BY MICROSOFT 365
              </Divider>

              <Button
                variant="outlined"
                fullWidth
                size="large"
                onClick={login}
                startIcon={<MicrosoftIcon />}
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2 }
                }}
              >
                Sign in with Microsoft
              </Button>
            </Stack>

            <Box sx={{ mt: 6 }}>
              <Button
                startIcon={<TerminalIcon />}
                variant="text"
                size="small"
                onClick={() => setDevMode(!devMode)}
                sx={{ 
                  color: 'text.secondary',
                  opacity: 0.6,
                  '&:hover': { opacity: 1 }
                }}
              >
                {devMode ? 'Switch to Production View' : 'Developer Sandbox Mode'}
              </Button>
            </Box>

            {devMode && (
              <Fade in>
                <Card sx={{ mt: 4, borderRadius: 3, border: '1px solid var(--border)', textAlign: 'left' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }} gutterBottom color="text.secondary">
                      DEV ACCOUNTS
                    </Typography>
                    {loading && <CircularProgress size={20} sx={{ mb: 1 }} />}
                    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {devUsers.map(user => (
                        <ListItem
                          key={user.id}
                          sx={{ 
                            borderRadius: 2, 
                            mb: 1,
                            bgcolor: 'rgba(0,0,0,0.02)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                          }}
                          secondaryAction={
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleDevLogin(user.id)}
                              disabled={loading}
                              sx={{ borderRadius: 2, textTransform: 'none' }}
                            >
                              Enter
                            </Button>
                          }
                        >
                          <ListItemText
                            primary={user.name}
                            secondary={user.email}
                            slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                          />
                          <Chip 
                            label={user.role} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 2, fontWeight: 'bold', fontSize: '0.65rem' }} 
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Fade>
            )}
          </Paper>
          
          <Typography variant="caption" sx={{ mt: 4, display: 'block', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
            © 2026 WorkTrack Inc. Built for performance.
          </Typography>
        </Container>
      </Fade>
    </Box>
  );
};

export default LoginPage;