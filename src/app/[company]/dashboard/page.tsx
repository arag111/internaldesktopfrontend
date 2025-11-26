'use client';

import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
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
  PersonOutline, Smartphone, BarChart as BarChartIcon,
  Refresh, DateRange, Assessment, WorkHistory, Speed,
  Visibility, Download, FilterList, Today, ViewWeek, CalendarMonth
} from '@mui/icons-material';
import RecentTimeClaimsWidget from '@/app/components/RecentTimeClaimsWidget';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, Legend, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { baseUrl } from '@/app/utils/config';
import { formatISTDateRange } from '@/app/utils/timezone';

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

// Late login configuration
const EXPECTED_LOGIN_HOUR = 10;    // 10:00 AM
const EXPECTED_LOGIN_MINUTE = 0;

// Check if user logged in late
const isLateLogin = (punchInTime: string | null): boolean => {
  if (!punchInTime) return false;

  const loginTime = new Date(punchInTime);
  const expectedTime = new Date(loginTime);
  expectedTime.setHours(EXPECTED_LOGIN_HOUR, EXPECTED_LOGIN_MINUTE, 0, 0);

  return loginTime > expectedTime;
};

// Calculate late duration in minutes
const getLateDuration = (punchInTime: string): number => {
  if (!punchInTime) return 0;

  const loginTime = new Date(punchInTime);
  const expectedTime = new Date(loginTime);
  expectedTime.setHours(EXPECTED_LOGIN_HOUR, EXPECTED_LOGIN_MINUTE, 0, 0);

  if (loginTime <= expectedTime) return 0;

  return Math.floor((loginTime - expectedTime) / 60000); // minutes
};

interface UserStats {
  user: {
    id: number;
    name: string;
    email: string;
  };
  stats: any[];
}

interface TeamStatus {
  total: number;
  active: number;
  idle: number;
  onBreak: number;
  offline: number;
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
  const userStatusesRef = useRef<Record<string, { status: string; timestamp: string }>>({});
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [teamStatus, setTeamStatus] = useState<TeamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllTeamActivity, setShowAllTeamActivity] = useState(false);
  const [statusUpdateTrigger, setStatusUpdateTrigger] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const hasRestoredFromStorage = useRef(false);

  // Initialize role and selectedUserId from localStorage on mount
  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);

    // Restore selected user from localStorage
    const storedUserId = localStorage.getItem('selectedUserId');
    if (storedUserId) {
      setSelectedUserId(parseInt(storedUserId));
    }
    hasRestoredFromStorage.current = true;
  }, []);

  // Save selectedUserId to localStorage whenever it changes
  useEffect(() => {
    if (selectedUserId !== null) {
      localStorage.setItem('selectedUserId', selectedUserId.toString());
    }
  }, [selectedUserId]);

  // Fetch data when range changes (not when selectedUserId changes)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (!token) {
      router.push('/');
      return;
    }

    const [start, end] = selectedRange;
    // ✅ Use centralized IST utility instead of duplicate function
    const dateRange = formatISTDateRange(start, end);

    const fetchData = async () => {
      setLoading(true);
      try {
        if (storedRole === 'admin' || storedRole === 'manager') {
          const [statsResponse, statusesResponse, teamStatusResponse] = await Promise.all([
            axios.get(
              `${baseUrl}/api/activity/all-users?start=${dateRange.start}&end=${dateRange.end}`,
              { headers: { Authorization: `Bearer ${token}` } }
            ),
            axios.get(
              `${baseUrl}/api/activity/user-statuses`,
              { headers: { Authorization: `Bearer ${token}` } }
            ),
            axios.get(
              `${baseUrl}/api/activity/team-status`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
          ]);
          setAllUserStats(statsResponse.data);
          // Set initial user statuses
          userStatusesRef.current = statusesResponse.data;
          // Calculate initial active users count
          const initialActiveCount = Object.values(statusesResponse.data).filter((s: any) => s.status === 'online' || s.status === 'active').length;
          setActiveUsersCount(initialActiveCount);
          // Set team status
          setTeamStatus(teamStatusResponse.data);
        } else {
          const userId = JSON.parse(atob(token.split('.')[1])).id;
          const apiUrl = `${baseUrl}/api/activity/range/${userId}?start=${dateRange.start}&end=${dateRange.end}`;

          console.log('🔍 [User Dashboard Debug]');
          console.log('   API URL:', apiUrl);
          console.log('   User ID:', userId);
          console.log('   Date Range:', dateRange.start, 'to', dateRange.end);

          const { data } = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${token}` }
          });

          console.log('📊 [API Response]');
          console.log('   Data type:', Array.isArray(data) ? 'Array' : typeof data);
          console.log('   Number of records:', Array.isArray(data) ? data.length : 'N/A');
          console.log('   Data:', data);

          setStats(data);
        }
      } catch (error: any) {
        console.error('❌ [API Error]');
        console.error('   Message:', error.message);
        if (error.response) {
          console.error('   Status:', error.response.status);
          console.error('   Data:', error.response.data);
        }
        console.error('   Full error:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  }, [router, selectedRange]);

  // Initialize selectedUserId from allUserStats if needed (only if not restored from localStorage)
  useEffect(() => {
    if ((role === 'admin' || role === 'manager') && selectedUserId === null && allUserStats.length > 0 && hasRestoredFromStorage.current) {
      setSelectedUserId(allUserStats[0].user.id);
    }
  }, [allUserStats, role, selectedUserId]);

  const handleStatusUpdate = useCallback(({ userId, status, timestamp }: { userId: number; status: string; timestamp: string }) => {
    userStatusesRef.current = {
      ...userStatusesRef.current,
      [userId]: { status, timestamp },
    };
    // ✅ Trigger re-render to update sorted team activity
    setStatusUpdateTrigger(prev => prev + 1);

    // Calculate active users count
    const activeCount = Object.values(userStatusesRef.current).filter((s: any) => s.status === 'online' || s.status === 'active').length;
    setActiveUsersCount(activeCount);
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
    () => {
      const result = role === 'admin' || role === 'manager'
        ? allUserStats.find((u) => u.user.id === selectedUserId)?.stats || []
        : stats;

      console.log('📈 [Current Stats]');
      console.log('   Role:', role);
      console.log('   Stats array length:', result.length);
      console.log('   Stats:', result);

      return result;
    },
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

  // Helper function to format seconds into "Xh Ym" format
  const formatSecondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0m';
    }
  };

  // Calculate summary stats with memoization
  const summaryStats = useMemo(() => {
    // For admin/manager: aggregate stats across ALL users
    if (role === 'admin' || role === 'manager') {
      if (!allUserStats || allUserStats.length === 0) {
        return {
          totalHours: 0,
          totalSeconds: 0,
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
      // Calculate productivity: working / (working + breaks + idle) * 100
      const totalTimeAtDesk = totalSeconds + totalBreakSeconds + totalIdleSeconds;
      const avgProductivity = totalTimeAtDesk > 0 ? Math.round((totalSeconds / totalTimeAtDesk) * 100) : 0;

      return {
        totalHours,
        totalSeconds,
        avgProductivity: Math.max(0, Math.min(100, avgProductivity)), // Clamp between 0-100
        activeDays: totalActiveDays,
        peakHours: '0',
        totalUsers: allUserStats.length,
        activeUsers: allUserStats.length // Will be calculated separately to avoid re-renders
      };
    }

    // For regular users: show their own stats
    if (!currentStats || currentStats.length === 0) {
      return {
        totalHours: 0,
        totalSeconds: 0,
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
    const totalTimeAtDesk = totalSeconds + totalBreakSeconds + totalIdleSeconds;
    const avgProductivity = totalTimeAtDesk > 0 ? Math.round((totalSeconds / totalTimeAtDesk) * 100) : 0;
    const peakHours = (peakSeconds / 3600).toFixed(1);

    return {
      totalHours,
      totalSeconds,
      avgProductivity: Math.max(0, Math.min(100, avgProductivity)),
      activeDays,
      peakHours,
      totalUsers: allUserStats.length,
      activeUsers: 1 // Will be calculated separately to avoid re-renders
    };
  }, [role, currentStats, allUserStats]);

  // ✅ NEW: Sorted team activity list - prioritize online users with low working time
  const sortedTeamActivity = useMemo(() => {
    return [...allUserStats].sort((a, b) => {
      const statusA = userStatusesRef.current[a.user.id];
      const statusB = userStatusesRef.current[b.user.id];
      const isOnlineA = statusA?.status === 'online' || statusA?.status === 'active';
      const isOnlineB = statusB?.status === 'online' || statusB?.status === 'active';

      // First priority: Online status (online users first)
      if (isOnlineA && !isOnlineB) return -1;
      if (!isOnlineA && isOnlineB) return 1;

      // Second priority: Working time (lower working time first within same status)
      const workingTimeA = a.stats[0]?.workingTimeInSeconds || 0;
      const workingTimeB = b.stats[0]?.workingTimeInSeconds || 0;

      return workingTimeA - workingTimeB;
    });
  }, [allUserStats, statusUpdateTrigger]);

  const StatCard = memo(({ title, value, icon, color, trend, subtitle }: any) => {
    const colorMap: any = {
      primary: { iconColor: '#3b82f6', accent: '#3b82f6' },
      success: { iconColor: '#10b981', accent: '#10b981' },
      secondary: { iconColor: '#8b5cf6', accent: '#8b5cf6' },
      warning: { iconColor: '#f59e0b', accent: '#f59e0b' }
    };
    const colors = colorMap[color] || colorMap.primary;

    return (
      <Grow in={true} appear={false}>
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
                    title="Active"
                    value={teamStatus?.active || 0}
                    icon={<CheckCircle sx={{ fontSize: 28 }} />}
                    color="success"
                    subtitle={`${teamStatus?.active || 0}/${teamStatus?.total || 0} members`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Idle"
                    value={teamStatus?.idle || 0}
                    icon={<AccessTime sx={{ fontSize: 28 }} />}
                    color="warning"
                    subtitle={`${teamStatus?.idle || 0}/${teamStatus?.total || 0} members`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Break"
                    value={teamStatus?.onBreak || 0}
                    icon={<Timer sx={{ fontSize: 28 }} />}
                    color="warning"
                    subtitle={`${teamStatus?.onBreak || 0}/${teamStatus?.total || 0} members`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Offline"
                    value={teamStatus?.offline || 0}
                    icon={<Cancel sx={{ fontSize: 28 }} />}
                    color="secondary"
                    subtitle={`${teamStatus?.offline || 0}/${teamStatus?.total || 0} members`}
                  />
                </Grid>
              </Grid>

              {/* Recent Time Claims Widget - Top Priority */}
              {(role === 'admin' || role === 'manager') && (
                <Fade in={!loading} timeout={700}>
                  <Box sx={{ mb: 3 }}>
                    <RecentTimeClaimsWidget />
                  </Box>
                </Fade>
              )}

              {/* Recent Activity */}
              {(role === 'admin' || role === 'manager') && (
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
                          onClick={() => setShowAllTeamActivity(!showAllTeamActivity)}
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
                          {showAllTeamActivity ? 'Show Less' : 'View All'}
                        </Button>
                      </Box>
                      <List>
                        {(showAllTeamActivity ? sortedTeamActivity : sortedTeamActivity.slice(0, 5)).map((userStat, index) => {
                          const status = userStatusesRef.current[userStat.user.id];
                          const isOnline = status?.status === 'online' || status?.status === 'active';

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
                                {(() => {
                                  const punchInTime = userStat.stats[0]?.punchInTime;
                                  if (!punchInTime) return null;

                                  const isLate = isLateLogin(punchInTime);
                                  const lateMinutes = getLateDuration(punchInTime);

                                  if (!isLate) {
                                    // Show "On Time" badge
                                    return (
                                      <Chip
                                        label="On Time"
                                        size="small"
                                        sx={{
                                          backgroundColor: '#d1fae5',
                                          color: '#065f46',
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          height: '24px'
                                        }}
                                      />
                                    );
                                  }

                                  // Show "Late" badge with minutes
                                  return (
                                    <Chip
                                      label={`Late ${lateMinutes}m`}
                                      size="small"
                                      sx={{
                                        backgroundColor: '#fee2e2',
                                        color: '#991b1b',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        height: '24px'
                                      }}
                                    />
                                  );
                                })()}
                              </Box>
                            </ListItem>
                          );
                        })}
                      </List>
                    </CardContent>
                  </Card>
                </Fade>
              )}
            </Container>
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