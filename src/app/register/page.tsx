'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import { baseUrl } from '@/app/utils/config';
import {
  Box, Button, TextField, Typography, Paper, Divider, Link, InputAdornment,
  ThemeProvider, createTheme, CssBaseline, Fade
} from '@mui/material';
import { BusinessOutlined, PersonOutlined, EmailOutlined, LockOutlined, RocketLaunch, Groups, Storage } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#096eb6',
      light: '#e1f0fa',
      dark: '#054a80',
      contrastText: '#ffffff',
    },
    secondary: { main: '#4a4a4a' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1a365d', secondary: '#718096' },
  },
  typography: {
    fontFamily: '"Poppins", "Inter", sans-serif',
    h5: { fontWeight: 700, fontSize: '1.75rem' },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.5 },
  },
  shape: { borderRadius: 12 },
});

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName || !adminName || !adminEmail || !password) {
      setToastMessage({ message: 'All fields are required', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (password.length < 6) {
      setToastMessage({ message: 'Password must be at least 6 characters', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (password !== confirmPassword) {
      setToastMessage({ message: 'Passwords do not match', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${baseUrl}/api/register`, {
        companyName,
        adminName,
        adminEmail,
        password,
      });

      const data = res.data;

      // Tokens are now stored in httpOnly cookies by the server
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userName', data.user.name || data.user.username);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('username', data.user.username);
      if (data.user.companyId) {
        localStorage.setItem('companyId', data.user.companyId);
      }

      setToastMessage({ message: 'Company registered successfully!', type: 'success' });

      // Validate redirect URL to prevent open redirect attacks
      const redirectUrl = data.redirectUrl || '/dashboard';
      const isRelativePath = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//');
      setTimeout(() => router.push(isRelativePath ? redirectUrl : '/dashboard'), 500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.msg || 'Registration failed. Please try again.';
      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
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
          <Image src="/time_nexus_logo.png" alt="TrackNexus Logo" width={150} height={50} style={{ objectFit: 'contain' }} />
          <Link href="/" underline="none" color="primary.main" sx={{ fontWeight: 600, fontSize: 14 }}>
            Already have an account? Sign In
          </Link>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in timeout={500}>
            <Paper sx={{ width: '100%', maxWidth: 1000, borderRadius: 4, overflow: 'hidden', display: 'flex', minHeight: 600 }}>
              {/* Left info panel */}
              <Box sx={{ flex: 1, p: 5, bgcolor: 'primary.light', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" color="text.primary" gutterBottom>
                  Start Tracking For Free
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create your company account and start monitoring your team's productivity in minutes.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { icon: <RocketLaunch sx={{ color: 'primary.main' }} />, title: 'Free Plan', text: 'Up to 5 users included' },
                    { icon: <Groups sx={{ color: 'primary.main' }} />, title: 'Team Management', text: 'Track attendance & activity' },
                    { icon: <Storage sx={{ color: 'primary.main' }} />, title: '5GB Storage', text: 'Screenshot & report storage' },
                  ].map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2 }}>
                      {item.icon}
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{item.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.text}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem />

              {/* Right form */}
              <Box component="form" onSubmit={handleRegister} sx={{ flex: 1, p: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" color="text.primary" gutterBottom>Create Your Account</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Register your company to get started</Typography>

                <TextField
                  fullWidth
                  label="Company Name"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><BusinessOutlined /></InputAdornment>,
                  }}
                  sx={{ mb: 2 }}
                  required
                />

                <TextField
                  fullWidth
                  label="Your Name"
                  placeholder="John Doe"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PersonOutlined /></InputAdornment>,
                  }}
                  sx={{ mb: 2 }}
                  required
                />

                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  placeholder="john@acme.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailOutlined /></InputAdornment>,
                  }}
                  sx={{ mb: 2 }}
                  required
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment>,
                  }}
                  sx={{ mb: 2 }}
                  required
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment>,
                  }}
                  sx={{ mb: 3 }}
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  sx={{ mb: 2 }}
                >
                  {loading ? 'Creating Account...' : 'Create Free Account'}
                </Button>

                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ fontSize: '0.75rem' }}>
                  By registering, you agree to our Terms of Service and Privacy Policy.
                </Typography>
              </Box>
            </Paper>
          </Fade>
        </Box>
      </Box>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 toast-slide-in">
          <div className={`rounded-lg border shadow-lg px-4 py-3 min-w-[300px] flex items-center justify-between gap-4 ${
            toastMessage.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              toastMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}>{toastMessage.message}</p>
            <button onClick={() => setToastMessage(null)} className={`hover:opacity-70 transition-colors flex-shrink-0 ${
              toastMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
