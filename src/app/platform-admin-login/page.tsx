'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { sendOTP, verifyOTP } from '@/app/lib/authService';
import {
  Box, Button, TextField, Typography, Paper, Link, InputAdornment,
  ThemeProvider, createTheme, CssBaseline, Fade
} from '@mui/material';
import { EmailOutlined, LockOutlined } from '@mui/icons-material';

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

export default function PlatformAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  // Redirect already-authenticated superadmin away from login page
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role === 'superadmin') {
      router.replace('/superadmin');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // OTP Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  if (!authChecked) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setToastMessage({ message: 'Please enter your email address', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setSendingOTP(true);
    try {
      const data = await sendOTP(email, 'platform-admin');
      setOtpSent(true);
      setOtpTimer(600); // 10 minutes in seconds
      setToastMessage({ message: data.msg || 'OTP sent successfully to your email', type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      let errorMessage = 'Failed to send OTP. Please try again.';

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 404) {
          errorMessage = data?.msg || 'OTP endpoint not found. Please check server configuration.';
        } else if (status === 400) {
          errorMessage = data?.msg || data?.message || 'Invalid email address. Please check and try again.';
        } else if (status === 429) {
          errorMessage = data?.msg || 'Too many requests. Please wait a few minutes before trying again.';
        } else if (status === 500) {
          errorMessage = data?.msg || data?.message || 'Server error. Please try again later.';
        } else if (data?.msg) {
          errorMessage = data.msg;
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : 'An error occurred';
        } else {
          errorMessage = `Request failed with status ${status}. Please try again.`;
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setToastMessage({ message: 'Please enter a valid 6-digit OTP', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOTP(email, otp);

      // Store token and user info in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userName', data.user.name || data.user.username);
      localStorage.setItem('username', data.user.username);
      if (data.user.email) {
        localStorage.setItem('userEmail', data.user.email);
      }

      // Validate redirect URL to prevent open redirect attacks
      const redirectUrl = data.redirectUrl || '/superadmin';
      const isRelativePath = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//');
      router.replace(isRelativePath ? redirectUrl : '/superadmin');
    } catch (err: any) {
      let errorMessage = 'Invalid OTP. Please try again.';

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 404) {
          errorMessage = 'OTP verification endpoint not found. Please check server configuration.';
        } else if (status === 400) {
          errorMessage = data?.msg || data?.message || 'Invalid OTP or email. Please check and try again.';
        } else if (status === 401) {
          errorMessage = data?.msg || 'OTP expired or invalid. Please request a new OTP.';
        } else if (status === 500) {
          errorMessage = data?.msg || data?.message || 'Server error. Please try again later.';
        } else if (data?.msg) {
          errorMessage = data.msg;
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : 'An error occurred';
        } else {
          errorMessage = `Request failed with status ${status}. Please try again.`;
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    await handleSendOTP(new Event('submit') as any);
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
          <Link href="/" underline="none" color="primary.main" sx={{ fontWeight: 600, fontSize: 14 }}>
            Back to Login
          </Link>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in timeout={500}>
            <Paper sx={{ width: '100%', maxWidth: 460, borderRadius: 4, overflow: 'hidden' }}>
              <Box component="form" onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} sx={{ p: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" color="text.primary" gutterBottom>Platform Admin</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Sign in with your email and OTP</Typography>

                <TextField
                  fullWidth
                  name="email"
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                  required
                  autoFocus
                />

                {otpSent && (
                  <>
                    <TextField
                      fullWidth
                      name="otp"
                      label="Enter OTP"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(value);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlined />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                      required
                      autoFocus
                    />
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {otpTimer > 0 ? (
                          <>OTP expires in: {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</>
                        ) : (
                          <span style={{ color: '#d32f2f' }}>OTP expired</span>
                        )}
                      </Typography>
                      <Link
                        component="button"
                        type="button"
                        onClick={handleResendOTP}
                        disabled={sendingOTP || otpTimer > 0}
                        sx={{
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          cursor: (sendingOTP || otpTimer > 0) ? 'not-allowed' : 'pointer',
                          opacity: (sendingOTP || otpTimer > 0) ? 0.5 : 1
                        }}
                      >
                        Resend OTP
                      </Link>
                    </Box>
                  </>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading || sendingOTP || (otpSent && (!otp || otp.length !== 6))}
                  sx={{ mb: 2 }}
                >
                  {loading ? 'Verifying...' : sendingOTP ? 'Sending OTP...' : otpSent ? 'Verify OTP' : 'Send OTP'}
                </Button>

                {otpSent ? (
                  <Button
                    type="button"
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setOtpTimer(0);
                    }}
                  >
                    Change Email
                  </Button>
                ) : (
                  <Button
                    type="button"
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={() => router.push('/')}
                  >
                    Back to Login
                  </Button>
                )}
              </Box>
            </Paper>
          </Fade>
        </Box>
      </Box>

      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 toast-slide-in">
          <div className={`rounded-lg border shadow-lg px-4 py-3 min-w-[300px] flex items-center justify-between gap-4 ${
            toastMessage.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'text-green-900'
                : 'text-red-900'
            }`}>
              {toastMessage.message}
            </p>
            <button
              onClick={() => setToastMessage(null)}
              className={`hover:opacity-70 transition-colors flex-shrink-0 ${
                toastMessage.type === 'success'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
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
