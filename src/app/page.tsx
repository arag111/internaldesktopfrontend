'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { login } from '@/app/lib/authService';
import {
  Box, Button, TextField, Typography, Grid, Paper, Divider, Link, InputAdornment,
  ThemeProvider, createTheme, CssBaseline, Fade
} from '@mui/material';
import { LockOutlined, PersonOutline, AccessTime, Analytics, Cloud } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#096eb6',
      light: '#e1f0fa',
      dark: '#054a80',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4a4a4a',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a365d',
      secondary: '#718096',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Inter", sans-serif',
    h5: {
      fontWeight: 700,
      fontSize: '1.75rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: 0.5,
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userName', data.user.name);

      // Store company ID if present
      if (data.user.companyId) {
        localStorage.setItem('companyId', data.user.companyId);
      }

      // Use the redirectUrl from backend
      const redirectUrl = data.redirectUrl || '/dashboard';
      console.log('Redirecting to:', redirectUrl); // Debug log
      router.push(redirectUrl);
    } catch {
      alert('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f5fbff 0%, #f0f7ff 100%)',
      }}>
        <Box sx={{ px: { xs: 2, md: 4 }, py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Image src="/time_nexus_logo.png" alt="Time Nexus Logo" width={150} height={50} style={{ objectFit: 'contain' }} />
          <Link href="#" underline="none" color="primary.main" sx={{ fontWeight: 600, fontSize: 14, display: { xs: 'none', sm: 'block' } }}>
            Need help? Contact Support
          </Link>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in timeout={500}>
            <Paper sx={{ width: '100%', maxWidth: 1000, borderRadius: 4, overflow: 'hidden', display: 'flex', minHeight: 600 }}>
              <Box sx={{ flex: 1, p: 5, bgcolor: 'primary.light', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" color="text.primary" gutterBottom>
                  Optimize Your Productivity
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Track Nexus helps teams measure what matters with automatic time tracking and intelligent analytics.
                </Typography>
                <Grid container spacing={2}>
                  {[{
                    icon: <AccessTime sx={{ color: 'primary.main' }} />, title: 'Automatic Tracking', text: 'Seamless time capture'
                  }, {
                    icon: <Analytics sx={{ color: 'primary.main' }} />, title: 'Smart Reports', text: 'Actionable insights'
                  }, {
                    icon: <Cloud sx={{ color: 'primary.main' }} />, title: 'Cloud Sync', text: 'Access data anywhere'
                  }].map((item, index) => (
                    <Grid item xs={12} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2 }}>
                        {item.icon}
                        <Box>
                          <Typography variant="body1" fontWeight={600}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{item.text}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, p: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" color="text.primary" gutterBottom>Welcome Back</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Sign in to access your dashboard</Typography>
                <TextField
                  fullWidth
                  name="username"
                  label="Username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                  required
                />
                <TextField
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 4 }}
                  required
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Box>
            </Paper>
          </Fade>
        </Box>
      </Box>
    </ThemeProvider>
  );
}