'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import axios from 'axios';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  Box, Typography, Card, CardContent, Grid, Button, Avatar, Chip, Paper,
  ThemeProvider, createTheme, LinearProgress, Tooltip, IconButton,
  Divider, List, ListItem, ListItemAvatar, ListItemText, Badge,
  Select, MenuItem, FormControl, InputLabel, Fade, Grow, Skeleton,
  Container, Stack, useMediaQuery
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Dashboard, TrendingUp, TrendingDown, AccessTime, Groups,
  CheckCircle, Cancel, Warning, CalendarToday, Timer,
  PersonOutline, Computer, Smartphone, BarChart as BarChartIcon,
  Refresh, DateRange, Assessment, WorkHistory, Speed,
  Visibility, Download, FilterList, Today, ViewWeek, CalendarMonth
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, Legend, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { baseUrl } from '@/app/utils/config';
import Navbar from '@/app/components/Navbar';
import Sidebar from '@/app/components/Sidebar';

const socket = io(baseUrl);

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
    success: {
      main: '#48bb78',
      light: '#68d391',
      dark: '#38a169'
    },
    warning: {
      main: '#f6ad55',
      light: '#f8b86c',
      dark: '#ed8936'
    },
    error: {
      main: '#fc8181',
      light: '#fd9999',
      dark: '#e53e3e'
    },
    background: {
      default: '#f7fafc',
      paper: '#ffffff'
    },
    text: {
      primary: '#2d3748',
      secondary: '#718096'
    }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h6: {
      fontWeight: 600
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
          '&:hover': {
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8
        }
      }
    }
  }
});

const rangePresets = [
  { label: 'Today', icon: <Today />, range: [new Date(), new Date()] },
  { label: 'This Week', icon: <ViewWeek />, range: [startOfWeek(new Date()), endOfWeek(new Date())] },
  { label: 'This Month', icon: <CalendarMonth />, range: [startOfMonth(new Date()), endOfMonth(new Date())] }
];

export default function DashboardPage() {
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [stats, setStats] = useState<any[]>([]);
  const [allUserStats, setAllUserStats] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState(rangePresets[0].range);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, { status: string; timestamp: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);
    if (!token) return router.push('/');

    const [start, end] = selectedRange;
    const toISTDate = (date: Date) => {
      const istOffset = 5.5 * 60;
      const utc = date.getTime() + date.getTimezoneOffset() * 60000;
      return new Date(utc + istOffset * 60000);
    };
    const istStart = toISTDate(start);
    const istEnd = toISTDate(end);

    const fetchData = async () => {
      setLoading(true);
      try {
        if (storedRole === 'admin' || storedRole === 'manager') {
          const { data } = await axios.get(
            `${baseUrl}/api/activity/all-users?start=${format(istStart, 'yyyy-MM-dd')}&end=${format(istEnd, 'yyyy-MM-dd')}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setAllUserStats(data);
          if (!selectedUserId && data.length > 0) {
            setSelectedUserId(data[0].user.id);
          }
        } else {
          const userId = JSON.parse(atob(token.split('.')[1])).id;
          const { data } = await axios.get(
            `${baseUrl}/api/activity/range/${userId}?start=${format(istStart, 'yyyy-MM-dd')}&end=${format(istEnd, 'yyyy-MM-dd')}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  }, [router, selectedRange, selectedUserId]);

  useEffect(() => {
    if (role === 'admin' || role === 'manager') {
      const token = localStorage.getItem('token');
      if (!token) return;

  const handleStatusUpdate = ({ userId, status, timestamp }: { userId: number; status: string; timestamp: string }) => {
    setUserStatuses((prev) => ({
      ...prev,
      [userId]: { status, timestamp },
    }));
  };

      socket.on('status:update', handleStatusUpdate);

      return () => {
        socket.off('status:update', handleStatusUpdate);
      };
    }
  }, [role]);

  const currentStats =
    role === 'admin' || role === 'manager'
      ? allUserStats.find((u) => u.user.id === selectedUserId)?.stats || []
      : stats;

  const handleRefresh = () => {
    setRefreshing(true);
    const [start, end] = selectedRange;
    setSelectedRange([start, end]);
  };

  const handleRangeChange = (index: number) => {
    setSelectedPreset(index);
    setSelectedRange(rangePresets[index].range);
  };

  // Calculate summary stats
  const calculateSummaryStats = () => {
    if (!currentStats || currentStats.length === 0) {
      return {
        totalHours: 0,
        avgProductivity: 0,
        activeDays: 0,
        peakHours: '0',
        totalUsers: 0,
        activeUsers: 0
      };
    }

    const totalMinutes = currentStats.reduce((sum: number, day: any) => sum + (day.totalMinutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const avgProductivity = currentStats.reduce((sum: number, day: any) => sum + (day.productivity || 0), 0) / currentStats.length;
    const activeDays = currentStats.filter((day: any) => day.totalMinutes > 0).length;
    const peakHours = Math.max(...currentStats.map((day: any) => day.totalMinutes || 0)) / 60;

    return {
      totalHours,
      avgProductivity: Math.round(avgProductivity),
      activeDays,
      peakHours: peakHours.toFixed(1),
      totalUsers: allUserStats.length,
      activeUsers: Object.values(userStatuses).filter((s: any) => s.status === 'online').length
    };
  };

  const summaryStats = calculateSummaryStats();


  interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    trend?: number;
    subtitle?: string;
  }

  const StatCard = ({ title, value, icon, color, trend, subtitle }: StatCardProps) => {
    const colorPalette = theme.palette[color] as { main: string; light: string };
    return (
      <Grow in={!loading} timeout={600}>
        <Card sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${alpha(colorPalette.main, 0.1)} 0%, ${alpha(colorPalette.light, 0.05)} 100%)`,
          border: `1px solid ${alpha(colorPalette.main, 0.1)}`
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Typography color="textSecondary" variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  {title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: colorPalette.main, mb: 0.5 }}>
                  {loading ? <Skeleton width={100} /> : value}
                </Typography>
                {subtitle && (
                  <Typography variant="caption" color="textSecondary">
                    {subtitle}
                  </Typography>
                )}
                {trend !== undefined && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {trend > 0 ? (
                      <TrendingUp sx={{ fontSize: 16, color: theme.palette.success.main, mr: 0.5 }} />
                    ) : (
                      <TrendingDown sx={{ fontSize: 16, color: theme.palette.error.main, mr: 0.5 }} />
                    )}
                    <Typography variant="caption" sx={{
                      color: trend > 0 ? theme.palette.success.main : theme.palette.error.main,
                      fontWeight: 600
                    }}>
                      {Math.abs(trend)}% from last period
                    </Typography>
                  </Box>
                )}
              </Box>
              <Avatar sx={{
                bgcolor: alpha(colorPalette.main, 0.15),
                width: 56,
                height: 56
              }}>
                {icon}
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grow>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Navbar />

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          {(role === 'admin' || role === 'manager') && (
            <aside className="w-64 fixed top-16 left-64 bottom-0 backdrop-blur-xl bg-gradient-to-b from-white via-gray-50/95 to-white border-r border-gray-200/60 shadow-2xl shadow-gray-900/10 p-5 overflow-y-auto z-10">
              {/* Header with gradient */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-[#075a96]/10 via-[#0a6fb8]/5 to-transparent rounded-xl blur-sm"></div>
                <h2 className="relative text-2xl font-bold bg-gradient-to-r from-[#075a96] to-[#0a6fb8] bg-clip-text text-transparent mb-1">
                  Users
                </h2>
                <p className="relative text-xs text-gray-500 font-medium">Select a team member</p>
              </div>

              {/* Modern Search Input */}
              <div className="relative mb-5 group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#075a96]/20 to-[#0a6fb8]/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="relative w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200/60 rounded-xl shadow-sm focus:shadow-lg focus:border-[#075a96]/40 focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-sm font-medium"
                />
              </div>

              {/* User List */}
              <ul className="space-y-2.5">
                {allUserStats.filter(({ user }) =>
                  user.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(({ user }) => {
                  const isSelected = user.id === selectedUserId;
                  const statusInfo = userStatuses[user.id];
                  const status = statusInfo?.status || 'offline';
                  const statusColor =
                    status === 'online'
                      ? 'bg-green-500'
                      : status === 'on break'
                      ? 'bg-yellow-500'
                      : status === 'idle'
                      ? 'bg-red-500'
                      : 'bg-gray-400';
                  const statusGlow =
                    status === 'online'
                      ? 'shadow-green-500/50'
                      : status === 'on break'
                      ? 'shadow-yellow-500/50'
                      : status === 'idle'
                      ? 'shadow-red-500/50'
                      : 'shadow-gray-400/30';

                  return (
                    <li
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`group relative cursor-pointer transition-all duration-300 ${
                        isSelected 
                          ? 'transform scale-[1.02]' 
                          : 'hover:transform hover:scale-[1.01]'
                      }`}
                    >
                      {/* Background gradient for selected */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#075a96]/15 via-[#0a6fb8]/10 to-[#075a96]/15 rounded-xl blur-sm"></div>
                      )}
                      
                      {/* Main card */}
                      <div className={`relative px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#075a96]/10 via-white to-[#0a6fb8]/5 border-[#075a96]/30 shadow-lg shadow-[#075a96]/10'
                          : 'bg-white/60 backdrop-blur-sm border-gray-200/40 hover:border-[#075a96]/20 hover:bg-white/80 hover:shadow-md'
                      }`}>
                        <div className="flex items-center justify-between">
                          {/* User name with avatar circle */}
                          <div className="flex items-center gap-3">
                            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg transition-all duration-300 ${
                              isSelected
                                ? 'bg-gradient-to-br from-[#075a96] to-[#0a6fb8] scale-110'
                                : 'bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-[#075a96]/80 group-hover:to-[#0a6fb8]/80'
                            }`}>
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                              {isSelected && (
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
                              )}
                            </div>
                            <span className={`font-semibold text-sm transition-colors duration-300 ${
                              isSelected ? 'text-[#075a96]' : 'text-gray-700 group-hover:text-[#075a96]'
                            }`}>
                              {user.name}
                            </span>
                          </div>

                          {/* Status indicator with glow */}
                          <div className="relative">
                            <span className={`w-3.5 h-3.5 rounded-full ${statusColor} block shadow-lg ${statusGlow} transition-all duration-300 ${
                              isSelected ? 'scale-125' : 'group-hover:scale-110'
                            }`}></span>
                            {status === 'online' && (
                              <span className={`absolute inset-0 rounded-full ${statusColor} animate-ping opacity-75`}></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}

          <Box sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3, md: 4 }
          }}>
            <Container maxWidth={false}>
              {/* Header */}
              <Fade in timeout={500}>
                <Paper sx={{
                  p: 3,
                  mb: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 3,
                  color: 'white'
                }}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                  }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        {role === 'admin' ? 'Admin Dashboard' : role === 'manager' ? 'Manager Dashboard' : 'My Dashboard'}
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.9 }}>
                        Track productivity and manage your team effectively
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={selectedPreset}
                          onChange={(e) => handleRangeChange(e.target.value as number)}
                          sx={{
                            bgcolor: alpha('#fff', 0.2),
                            color: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#fff', 0.3)
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#fff', 0.5)
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'white'
                            }
                          }}
                        >
                          {rangePresets.map((preset, index) => (
                            <MenuItem key={index} value={index}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {preset.icon}
                                {preset.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Tooltip title="Refresh Data">
                        <IconButton
                          onClick={handleRefresh}
                          sx={{
                            color: 'white',
                            bgcolor: alpha('#fff', 0.2),
                            '&:hover': {
                              bgcolor: alpha('#fff', 0.3)
                            }
                          }}
                        >
                          <Refresh className={refreshing ? 'animate-spin' : ''} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Paper>
              </Fade>

              {/* Summary Stats */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Total Hours"
                    value={`${summaryStats.totalHours}h`}
                    icon={<AccessTime sx={{ fontSize: 28 }} />}
                    color="primary"
                    subtitle="Tracked this period"
                    trend={12}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Productivity"
                    value={`${summaryStats.avgProductivity}%`}
                    icon={<Speed sx={{ fontSize: 28 }} />}
                    color="success"
                    subtitle="Average score"
                    trend={8}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Active Days"
                    value={summaryStats.activeDays}
                    icon={<CalendarToday sx={{ fontSize: 28 }} />}
                    color="secondary"
                    subtitle={`Out of ${currentStats.length} days`}
                    trend={-5}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title={role === 'admin' || role === 'manager' ? 'Team Members' : 'Peak Hours'}
                    value={role === 'admin' || role === 'manager' ?
                      `${summaryStats.activeUsers}/${summaryStats.totalUsers}` :
                      `${summaryStats.peakHours}h`
                    }
                    icon={role === 'admin' || role === 'manager' ?
                      <Groups sx={{ fontSize: 28 }} /> :
                      <Timer sx={{ fontSize: 28 }} />
                    }
                    color="warning"
                    subtitle={role === 'admin' || role === 'manager' ? 'Online now' : 'Maximum in a day'}
                  />
                </Grid>
              </Grid>

              {/* Recent Activity */}
              <Grid container spacing={3}>
                {(role === 'admin' || role === 'manager') && (
                  <Grid size={12}>
                    <Fade in={!loading} timeout={900}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Team Activity
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<Visibility />}
                              sx={{ textTransform: 'none' }}
                            >
                              View All
                            </Button>
                          </Box>
                          <List>
                            {allUserStats.slice(0, 5).map((userStat, index) => {
                              const status = userStatuses[userStat.user.id];
                              const isOnline = status?.status === 'online';

                              return (
                                <ListItem
                                  key={userStat.user.id}
                                  sx={{
                                    borderRadius: 2,
                                    mb: 1,
                                    bgcolor: selectedUserId === userStat.user.id ?
                                      alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                    '&:hover': {
                                      bgcolor: alpha(theme.palette.primary.main, 0.04)
                                    }
                                  }}
                                >
                                  <ListItemAvatar>
                                    <Badge
                                      overlap="circular"
                                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                      badgeContent={
                                        <Box sx={{
                                          width: 12,
                                          height: 12,
                                          borderRadius: '50%',
                                          bgcolor: isOnline ? theme.palette.success.main : theme.palette.grey[400],
                                          border: '2px solid white'
                                        }} />
                                      }
                                    >
                                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                                        {userStat.user.name?.charAt(0).toUpperCase() || 'U'}
                                      </Avatar>
                                    </Badge>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={userStat.user.name || userStat.user.username}
                                    secondary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Chip
                                          label={isOnline ? 'Online' : 'Offline'}
                                          size="small"
                                          color={isOnline ? 'success' : 'default'}
                                          sx={{ height: 20 }}
                                        />
                                        <Typography variant="caption" color="textSecondary">
                                          {userStat.stats[0]?.totalMinutes
                                            ? `${Math.round(userStat.stats[0].totalMinutes / 60)}h today`
                                            : 'No activity today'
                                          }
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Computer sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                                    <Typography variant="body2" color="textSecondary">
                                      {userStat.stats[0]?.productivity || 0}%
                                    </Typography>
                                  </Box>
                                </ListItem>
                              );
                            })}
                          </List>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                )}
              </Grid>
            </Container>
          </Box>
        </Box>
      </Box>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </ThemeProvider>
  );
}