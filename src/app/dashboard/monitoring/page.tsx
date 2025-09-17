'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import ScreenshotGallery from '@/app/components/ScreenshotGallery';
import { baseUrl } from '@/app/utils/config';
import Navbar from '@/app/components/Navbar';
import Sidebar from '@/app/components/Sidebar';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  InputAdornment,
  Chip,
  ThemeProvider,
  createTheme,
  alpha,
  IconButton,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  PhotoCamera as CameraIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      light: '#7c8ff0',
      dark: '#5a67d8'
    },
    secondary: {
      main: '#764ba2',
      light: '#8760ab',
      dark: '#663e8e'
    },
    background: {
      default: '#f7fafc',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.03em'
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          borderRadius: 16,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.3s ease'
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a67d8 0%, #663e8e 100%)',
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#ffffff',
            '&:hover fieldset': {
              borderColor: '#667eea',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
            }
          }
        }
      }
    }
  }
});

interface Screenshot {
  _id: string;
  url: string;
  timestamp: string;
}

interface UserScreenshots {
  [userName: string]: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    screenshots: Screenshot[];
  };
}

function getDefaultStartTime(): string {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 16);
}

function getDefaultEndTime(): string {
  const end = new Date();
  end.setHours(23, 59, 0, 0);
  return end.toISOString().slice(0, 16);
}

export default function MonitoringPage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [userScreenshots, setUserScreenshots] = useState<UserScreenshots>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [startDateTime, setStartDateTime] = useState<string>(getDefaultStartTime());
  const [endDateTime, setEndDateTime] = useState<string>(getDefaultEndTime());
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (!token) return router.push('/');
    setRole(userRole);
  }, [router]);

  useEffect(() => {
    if (role) {
      handleFetchClick();
    }
  }, [role]);

  const handleFetchClick = async () => {
    const token = localStorage.getItem('token');
    if (!token || !startDateTime || !endDateTime) return;

    setLoading(true);
    try {
      if (role === 'admin' || role === 'manager') {
        const { data } = await axios.get(
          `${baseUrl}/api/screenshots/all-in-range?startDate=${startDateTime}&endDate=${endDateTime}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUserScreenshots(data);
        const userKeys = Object.keys(data);
        if (userKeys.length > 0 && !selectedUser) {
          setSelectedUser(userKeys[0]);
        }
      } else {
        const { data } = await axios.get(
          `${baseUrl}/api/screenshots/range?startDate=${startDateTime}&endDate=${endDateTime}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setScreenshots(data.screenshots || []);
      }
    } catch (error) {
      console.error('Error fetching screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentUserShots =
    role === 'admin' || role === 'manager'
      ? userScreenshots?.[selectedUser || '']?.screenshots || []
      : screenshots;

  const filteredUserList = Object.keys(userScreenshots).filter((name) =>
    name.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
        <Navbar />

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />

          <Box sx={{
            flex: 1,
            ml: '240px',
            mt: '64px',
            p: 4,
            overflow: 'auto',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            minHeight: '100vh'
          }}>
            <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CameraIcon sx={{ fontSize: 40, mr: 2 }} />
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                        Screenshot Monitoring
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ opacity: 0.95 }}>
                      Track and review team activity through captured screenshots
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<PersonIcon />}
                        label={`Role: ${role || 'Loading...'}`}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                      <Chip
                        icon={<TimeIcon />}
                        label={new Date().toLocaleDateString()}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Time Range Selection
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      type="datetime-local"
                      label="Start Time"
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      type="datetime-local"
                      label="End Time"
                      value={endDateTime}
                      onChange={(e) => setEndDateTime(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleFetchClick}
                      disabled={loading}
                      startIcon={loading ? null : <RefreshIcon />}
                      sx={{ height: 56 }}
                    >
                      {loading ? 'Loading...' : 'Fetch'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {role === 'admin' || role === 'manager' ? (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ pb: 0 }}>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Team Members
                      </Typography>
                      <TextField
                        placeholder="Search team member..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 2 }}
                      />
                      <Chip
                        label={`${filteredUserList.length} members found`}
                        size="small"
                        color="primary"
                        sx={{ mb: 2 }}
                      />
                    </CardContent>
                    <Divider />
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                      <List sx={{ p: 0 }}>
                        {filteredUserList.length > 0 ? (
                          filteredUserList.map((name) => (
                            <ListItem key={name} disablePadding sx={{ mb: 1 }}>
                              <ListItemButton
                                selected={selectedUser === name}
                                onClick={() => setSelectedUser(name)}
                                sx={{
                                  borderRadius: 2,
                                  '&.Mui-selected': {
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    '&:hover': {
                                      background: 'linear-gradient(135deg, #5a67d8 0%, #663e8e 100%)',
                                    }
                                  }
                                }}
                              >
                                <ListItemText
                                  primary={name}
                                  secondary={userScreenshots[name]?.screenshots?.length + ' screenshots'}
                                  secondaryTypographyProps={{
                                    sx: {
                                      color: selectedUser === name ? 'rgba(255,255,255,0.8)' : 'text.secondary'
                                    }
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" align="center">
                            No team members found
                          </Typography>
                        )}
                      </List>
                    </Box>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 9 }}>
                  <Card sx={{ p: 2 }}>
                    {selectedUser && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Screenshots for {selectedUser}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {currentUserShots.length} screenshots captured
                        </Typography>
                      </Box>
                    )}
                    <ScreenshotGallery screenshots={currentUserShots} />
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Card sx={{ p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Your Screenshots
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentUserShots.length} screenshots captured
                  </Typography>
                </Box>
                <ScreenshotGallery screenshots={currentUserShots} />
              </Card>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}