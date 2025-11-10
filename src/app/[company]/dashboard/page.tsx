'use client';

import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
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
import CompanySidebar from '@/app/components/CompanySidebar';

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
          boxShadow: 'none',
          borderRadius: 8,
          transition: 'all 0.2s ease',
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

interface UserStats {
  user: {
    id: number;
    name: string;
    email: string;
  };
  stats: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [stats, setStats] = useState<any[]>([]);
  const [allUserStats, setAllUserStats] = useState<UserStats[]>([]);
  const [selectedRange, setSelectedRange] = useState(rangePresets[0].range);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, { status: string; timestamp: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize role on mount
  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);
  }, []);

  // Fetch data when range changes (not when selectedUserId changes)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (!token) {
      router.push('/');
      return;
    }

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
          // Only set selectedUserId if it's not already set
          if (selectedUserId === null && data.length > 0) {
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
  }, [router, selectedRange]);

  // Initialize selectedUserId from allUserStats if needed
  useEffect(() => {
    if ((role === 'admin' || role === 'manager') && selectedUserId === null && allUserStats.length > 0) {
      setSelectedUserId(allUserStats[0].user.id);
    }
  }, [allUserStats, role, selectedUserId]);

  const handleStatusUpdate = useCallback(({ userId, status, timestamp }: { userId: number; status: string; timestamp: string }) => {
    setUserStatuses((prev) => ({
      ...prev,
      [userId]: { status, timestamp },
    }));
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (role === 'admin' || role === 'manager') {
      const socketInstance = io(baseUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('status:update', handleStatusUpdate);
      setSocket(socketInstance);

      return () => {
        socketInstance.off('status:update', handleStatusUpdate);
        socketInstance.disconnect();
      };
    }
  }, [role, handleStatusUpdate]);

  const currentStats = useMemo(
    () => role === 'admin' || role === 'manager'
      ? allUserStats.find((u) => u.user.id === selectedUserId)?.stats || []
      : stats,
    [role, allUserStats, selectedUserId, stats]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const [start, end] = selectedRange;
    setSelectedRange([start, end]);
  }, [selectedRange]);

  const handleRangeChange = useCallback((index: number) => {
    setSelectedPreset(index);
    setSelectedRange(rangePresets[index].range);
  }, []);

  // Calculate summary stats with memoization
  const summaryStats = useMemo(() => {
    // For admin/manager: aggregate stats across ALL users
    if (role === 'admin' || role === 'manager') {
      if (!allUserStats || allUserStats.length === 0) {
        return {
          totalHours: 0,
          avgProductivity: 0,
          activeDays: 0,
          peakHours: '0',
          totalUsers: 0,
          activeUsers: 0
        };
      }

      // Aggregate across all users
      let totalSeconds = 0;
      let totalBreakSeconds = 0;
      let totalIdleSeconds = 0;
      let totalActiveDays = 0;

      allUserStats.forEach(userStat => {
        userStat.stats.forEach(day => {
          const workingSeconds = day.workingTimeInSeconds || 0;
          const breakSeconds = day.breakTimeInSeconds || 0;
          const idleSeconds = day.idleTimeInSeconds || 0;

          totalSeconds += workingSeconds;
          totalBreakSeconds += breakSeconds;
          totalIdleSeconds += idleSeconds;

          if (workingSeconds > 0) {
            totalActiveDays++;
          }
        });
      });

      const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
      // Calculate productivity: (working - breaks - idle) / working * 100
      const productiveSeconds = totalSeconds - totalBreakSeconds - totalIdleSeconds;
      const avgProductivity = totalSeconds > 0 ? Math.round((productiveSeconds / totalSeconds) * 100) : 0;

      return {
        totalHours,
        avgProductivity: Math.max(0, Math.min(100, avgProductivity)), // Clamp between 0-100
        activeDays: totalActiveDays,
        peakHours: '0',
        totalUsers: allUserStats.length,
        activeUsers: Object.values(userStatuses).filter((s: any) => s.status === 'online').length
      };
    }

    // For regular users: show their own stats
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

    let totalSeconds = 0;
    let totalBreakSeconds = 0;
    let totalIdleSeconds = 0;
    let activeDays = 0;
    let peakSeconds = 0;

    currentStats.forEach(day => {
      const workingSeconds = day.workingTimeInSeconds || 0;
      const breakSeconds = day.breakTimeInSeconds || 0;
      const idleSeconds = day.idleTimeInSeconds || 0;

      totalSeconds += workingSeconds;
      totalBreakSeconds += breakSeconds;
      totalIdleSeconds += idleSeconds;

      if (workingSeconds > 0) activeDays++;
      if (workingSeconds > peakSeconds) peakSeconds = workingSeconds;
    });

    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const productiveSeconds = totalSeconds - totalBreakSeconds - totalIdleSeconds;
    const avgProductivity = totalSeconds > 0 ? Math.round((productiveSeconds / totalSeconds) * 100) : 0;
    const peakHours = (peakSeconds / 3600).toFixed(1);

    return {
      totalHours,
      avgProductivity: Math.max(0, Math.min(100, avgProductivity)),
      activeDays,
      peakHours,
      totalUsers: allUserStats.length,
      activeUsers: Object.values(userStatuses).filter((s: any) => s.status === 'online').length
    };
  }, [role, currentStats, allUserStats, userStatuses]);

  // Prepare chart data with memoization
  const chartData = useMemo(() => currentStats.map(day => {
    const workingSeconds = day.workingTimeInSeconds || 0;
    const breakSeconds = day.breakTimeInSeconds || 0;
    const idleSeconds = day.idleTimeInSeconds || 0;
    const productiveSeconds = workingSeconds - breakSeconds - idleSeconds;
    const productivity = workingSeconds > 0 ? Math.round((productiveSeconds / workingSeconds) * 100) : 0;

    return {
      date: format(new Date(day.date), 'MMM dd'),
      hours: Math.round((workingSeconds / 3600) * 10) / 10,
      productivity: Math.max(0, Math.min(100, productivity)),
      screenshots: day.screenshots || 0
    };
  }), [currentStats]);

  const pieData = useMemo(() => [
    { name: 'Productive', value: summaryStats.avgProductivity, color: theme.palette.success.main },
    { name: 'Neutral', value: 30, color: theme.palette.warning.main },
    { name: 'Unproductive', value: 100 - summaryStats.avgProductivity - 30, color: theme.palette.error.main }
  ], [summaryStats.avgProductivity]);

  const StatCard = memo(({ title, value, icon, color, trend, subtitle }: any) => {
    const colorMap: any = {
      primary: { iconColor: '#3b82f6', accent: '#3b82f6' },
      success: { iconColor: '#10b981', accent: '#10b981' },
      secondary: { iconColor: '#8b5cf6', accent: '#8b5cf6' },
      warning: { iconColor: '#f59e0b', accent: '#f59e0b' }
    };
    const colors = colorMap[color] || colorMap.primary;

    return (
      <Grow in={!loading} timeout={600}>
        <Card sx={{
          height: '100%',
          backgroundColor: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {title}
                </Typography>
                <Box sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(colors.iconColor, 0.1),
                }}>
                  {React.isValidElement(icon) 
                    ? React.cloneElement(icon as React.ReactElement<any>, { 
                        sx: { fontSize: 18, color: colors.iconColor } 
                      })
                    : icon
                  }
                </Box>
              </Box>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#111827',
                fontSize: '2rem',
                lineHeight: 1.2
              }}>
                {loading ? <Skeleton width={100} height={40} /> : value}
              </Typography>
              {subtitle && (
                <Typography variant="body2" sx={{
                  color: '#9ca3af',
                  fontSize: '0.875rem',
                  fontWeight: 400
                }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grow>
    );
  });

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Navbar />

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <CompanySidebar />

          <Box sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 3, sm: 4, md: 5 },
            pt: { xs: 10, sm: 11, md: 12 },
            ml: '256px',
            backgroundColor: '#fafafa'
          }}>
            <Container maxWidth={false}>
              {/* Header */}
              <Fade in timeout={500}>
                <Box sx={{ mb: 4 }}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 3
                  }}>
                    <Box>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 700, 
                        color: '#111827', 
                        mb: 0.5,
                        fontSize: '2rem',
                        letterSpacing: '-0.025em'
                      }}>
                        {role === 'admin' ? 'Admin Dashboard' : role === 'manager' ? 'Manager Dashboard' : 'My Dashboard'}
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        color: '#6b7280', 
                        fontSize: '1rem',
                        fontWeight: 400
                      }}>
                        Track productivity and manage your team effectively
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                          value={selectedPreset}
                          onChange={(e) => handleRangeChange(e.target.value as number)}
                          sx={{
                            bgcolor: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              border: 'none'
                            },
                            '&:hover': {
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
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
                            bgcolor: 'white !important',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            color: '#111827 !important',
                            '&:hover': {
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                              bgcolor: 'white !important',
                              color: '#111827 !important'
                            },
                            '& .MuiSvgIcon-root': {
                              color: '#111827 !important'
                            }
                          }}
                        >
                          <Refresh className={refreshing ? 'animate-spin' : ''} sx={{ color: '#111827 !important' }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              </Fade>

              {/* Summary Stats */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
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

              {/* Charts */}
              <Grid container spacing={3}>
                {/* Activity Chart */}
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Fade in={!loading} timeout={700}>
                    <Card sx={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600,
                            color: '#111827',
                            fontSize: '1.125rem'
                          }}>
                            Activity Overview
                          </Typography>
                        </Box>
                        {loading ? (
                          <Skeleton variant="rectangular" height={300} />
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                stroke="#e2e8f0"
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                stroke="#e2e8f0"
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                stroke="#e2e8f0"
                                axisLine={false}
                                tickLine={false}
                              />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 8,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                              />
                              <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="hours"
                                stroke={theme.palette.primary.main}
                                fillOpacity={1}
                                fill="url(#colorHours)"
                                strokeWidth={2}
                                name="Hours"
                              />
                              <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="productivity"
                                stroke={theme.palette.success.main}
                                fillOpacity={1}
                                fill="url(#colorProductivity)"
                                strokeWidth={2}
                                name="Productivity %"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>

                {/* Productivity Breakdown */}
                <Grid size={{ xs: 12, lg: 4 }}>
                  <Fade in={!loading} timeout={800}>
                    <Card sx={{
                      height: '100%',
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600, 
                          mb: 3,
                          color: '#111827',
                          fontSize: '1.125rem'
                        }}>
                          Productivity Breakdown
                        </Typography>
                        {loading ? (
                          <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
                        ) : (
                          <>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip />
                              </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ mt: 2 }}>
                              {pieData.map((item) => (
                                <Box key={item.name} sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 1
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      bgcolor: item.color
                                    }} />
                                    <Typography variant="body2" color="textSecondary">
                                      {item.name}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.value}%
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>

                {/* Recent Activity */}
                {(role === 'admin' || role === 'manager') && (
                  <Grid size={12}>
                    <Fade in={!loading} timeout={900}>
                      <Card sx={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600,
                              color: '#111827',
                              fontSize: '1.125rem'
                            }}>
                              Team Activity
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<Visibility />}
                              sx={{ 
                                textTransform: 'none',
                                color: '#111827 !important',
                                fontWeight: 500,
                                bgcolor: 'white !important',
                                border: '1px solid #e5e7eb',
                                '&:hover': {
                                  bgcolor: 'white !important',
                                  color: '#111827 !important'
                                },
                                '& .MuiSvgIcon-root': {
                                  color: '#111827 !important'
                                }
                              }}
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
                                      '#f3f4f6' : 'transparent',
                                    '&:hover': {
                                      bgcolor: '#f9fafb'
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
                                    primary={userStat.user.name || userStat.user.email}
                                    secondary={
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <span
                                          style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            backgroundColor: isOnline ? '#4caf50' : '#9e9e9e',
                                            color: 'white',
                                            height: '20px',
                                            lineHeight: '16px'
                                          }}
                                        >
                                          {isOnline ? 'Online' : 'Offline'}
                                        </span>
                                        <Typography variant="caption" color="textSecondary" component="span">
                                          {userStat.stats[0]?.workingTimeInSeconds
                                            ? `${Math.round(userStat.stats[0].workingTimeInSeconds / 3600)}h today`
                                            : 'No activity today'
                                          }
                                        </Typography>
                                      </span>
                                    }
                                  />
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Computer sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                                    <Typography variant="body2" color="textSecondary">
                                      {(() => {
                                        const day = userStat.stats[0];
                                        if (!day) return '0%';
                                        const working = day.workingTimeInSeconds || 0;
                                        const breaks = day.breakTimeInSeconds || 0;
                                        const idle = day.idleTimeInSeconds || 0;
                                        const productive = working - breaks - idle;
                                        const productivity = working > 0 ? Math.round((productive / working) * 100) : 0;
                                        return `${Math.max(0, Math.min(100, productivity))}%`;
                                      })()}
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