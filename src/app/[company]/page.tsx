'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';
import moment from 'moment';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import { rangePresets } from '@/app/utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, Legend, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Calendar, Clock, Users, TrendingUp, Activity, ArrowRight } from 'lucide-react';

const socket = io(baseUrl);

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface DayStats {
  date: string;
  workingTimeInSeconds: number;
  breakTimeInSeconds: number;
  idleTimeInSeconds: number;
  rejectedIdleTimeInSeconds?: number;
  productivity?: number;
  screenshots?: number;
}

interface UserStat {
  user: User;
  stats: DayStats[];
}

interface UserStatus {
  status: string;
  timestamp: number;
}

export default function CompanyDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;

  const [stats, setStats] = useState<DayStats[]>([]);
  const [allUserStats, setAllUserStats] = useState<UserStat[]>([]);
  const [selectedRange, setSelectedRange] = useState(rangePresets[0].range);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const hasRestoredFromStorage = useRef(false);

  // Initialize selectedUserId from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('selectedUserId');
    if (storedUserId) {
      setSelectedUserId(storedUserId);
    }
    hasRestoredFromStorage.current = true;
  }, []);

  // Save selectedUserId to localStorage whenever it changes
  useEffect(() => {
    if (selectedUserId !== null) {
      localStorage.setItem('selectedUserId', selectedUserId);
    }
  }, [selectedUserId]);

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
      if (storedRole === 'admin' || storedRole === 'manager') {
        const { data } = await axios.get(
          `${baseUrl}/api/activity/all-users?start=${format(istStart, 'yyyy-MM-dd')}&end=${format(istEnd, 'yyyy-MM-dd')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAllUserStats(data);
      } else {
        const userId = JSON.parse(atob(token.split('.')[1])).id;
        const { data } = await axios.get(
          `${baseUrl}/api/activity/range/${userId}?start=${format(istStart, 'yyyy-MM-dd')}&end=${format(istEnd, 'yyyy-MM-dd')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStats(data);
      }
    };

    fetchData();
  }, [router, selectedRange, selectedUserId]);

  useEffect(() => {
    if (role === 'admin' || role === 'manager') {
      const token = localStorage.getItem('token');
      if (!token) return;

      const handleStatusUpdate = ({ userId, status, timestamp }: { userId: string; status: string; timestamp: number }) => {
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

  // Calculate summary stats for dashboard
  const calculateSummaryStats = () => {
    if (role === 'admin' || role === 'manager') {
      if (!allUserStats || allUserStats.length === 0) {
        return {
          totalHours: 0,
          avgProductivity: 0,
          activeDays: 0,
          totalUsers: allUserStats.length,
          activeUsers: Object.values(userStatuses).filter((s: any) => s.status === 'online' || s.status === 'active').length,
          todayHours: 0,
          avgHoursPerUser: 0
        };
      }

      let totalSeconds = 0;
      let totalBreakSeconds = 0;
      let totalIdleSeconds = 0;
      let totalActiveDays = 0;
      let todaySeconds = 0;

      allUserStats.forEach(userStat => {
        userStat.stats.forEach((day: DayStats) => {
          const workingSeconds = (day.workingTimeInSeconds || 0) - (day.rejectedIdleTimeInSeconds || 0);
          const breakSeconds = day.breakTimeInSeconds || 0;
          const idleSeconds = day.idleTimeInSeconds || 0;
          const rawWorkingSeconds = day.workingTimeInSeconds || 0;

          totalSeconds += workingSeconds;
          totalBreakSeconds += breakSeconds;
          totalIdleSeconds += idleSeconds;

          if (workingSeconds > 0) {
            totalActiveDays++;
          }

          // Today's hours
          if (day.date === format(new Date(), 'yyyy-MM-dd')) {
            todaySeconds += workingSeconds;
          }
        });
      });

      const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
      const todayHours = Math.round((todaySeconds / 3600) * 10) / 10;
      // Total time includes work, break, and idle time
      const totalTimeAtDesk = totalSeconds + totalBreakSeconds + totalIdleSeconds;
      // Productivity is the ratio of actual work time to total time at desk
      const avgProductivity = totalTimeAtDesk > 0 ? Math.round((totalSeconds / totalTimeAtDesk) * 100) : 0;
      const avgHoursPerUser = allUserStats.length > 0 ? Math.round((totalHours / allUserStats.length) * 10) / 10 : 0;

      return {
        totalHours,
        avgProductivity: Math.max(0, Math.min(100, avgProductivity)),
        activeDays: totalActiveDays,
        totalUsers: allUserStats.length,
        activeUsers: Object.values(userStatuses).filter((s: any) => s.status === 'online' || s.status === 'active').length,
        todayHours,
        avgHoursPerUser
      };
    } else {
      if (!stats || stats.length === 0) {
        return {
          totalHours: 0,
          avgProductivity: 0,
          activeDays: 0,
          totalUsers: 1,
          activeUsers: 0,
          todayHours: 0,
          avgHoursPerUser: 0
        };
      }

      const totalSeconds = stats.reduce((sum: number, day: DayStats) => {
        const working = (day.workingTimeInSeconds || 0) - (day.rejectedIdleTimeInSeconds || 0);
        return sum + working;
      }, 0);
      const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
      const todayStats = stats.find((s: DayStats) => s.date === format(new Date(), 'yyyy-MM-dd'));
      const todayHours = todayStats ? Math.round((((todayStats.workingTimeInSeconds || 0) - (todayStats.rejectedIdleTimeInSeconds || 0)) / 3600) * 10) / 10 : 0;
      const activeDays = stats.filter((day: DayStats) => (day.workingTimeInSeconds || 0) > 0).length;

      return {
        totalHours,
        avgProductivity: 75,
        activeDays,
        totalUsers: 1,
        activeUsers: 0,
        todayHours,
        avgHoursPerUser: totalHours
      };
    }
  };

  const summaryStats = calculateSummaryStats();

  // Prepare chart data
  const chartData = currentStats.slice(-7).map((day: DayStats) => ({
    date: format(new Date(day.date), 'MMM dd'),
    hours: Math.round((((day.workingTimeInSeconds || 0) - (day.rejectedIdleTimeInSeconds || 0)) / 3600) * 10) / 10,
    productivity: day.productivity || 0
  }));

  const handleViewAttendance = () => {
    router.push(`/${company}/attendance`);
  };

  return (
    <main
      className={`flex-1 overflow-y-auto mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50`}
      style={{ marginLeft: '16rem' }}
    >
      {/* Hero Banner */}
          <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 mb-0.5">
                    Welcome to Dashboard
                  </h1>
                  <p className="text-sm text-slate-500">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-0.5">Active Users</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {summaryStats.activeUsers} <span className="text-sm text-slate-500 font-normal">online</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-8 h-8 rounded-md bg-emerald-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-0.5">Today's Hours</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {summaryStats.todayHours}h <span className="text-sm text-slate-500 font-normal">tracked</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Hours Card */}
            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Hours</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500 opacity-60" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{summaryStats.totalHours}h</p>
              <p className="text-xs text-slate-500">Tracked this period</p>
            </div>

            {/* Productivity Card */}
            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-green-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Productivity</span>
                </div>
                <span className="text-sm font-bold text-green-600">{summaryStats.avgProductivity}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                <div 
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${summaryStats.avgProductivity}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500">Average score</p>
            </div>

            {/* Team Members Card */}
            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Team Members</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs font-bold text-slate-700">{summaryStats.activeUsers}/{summaryStats.totalUsers}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{summaryStats.totalUsers}</p>
              <p className="text-xs text-slate-500">Online now: {summaryStats.activeUsers}</p>
            </div>

            {/* Active Days Card */}
            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Days</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{summaryStats.activeDays}</p>
              <p className="text-xs text-slate-500">Out of {currentStats.length} days</p>
            </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Activity Chart */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Activity Overview</h2>
                </div>
                <button
                  onClick={handleViewAttendance}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-white text-black rounded-lg text-sm font-medium transition-colors duration-200 border border-slate-200 hover:border-slate-300"
                >
                  View Details
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#075a96" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#075a96" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#075a96"
                      fillOpacity={1}
                      fill="url(#colorHours)"
                      strokeWidth={2}
                      name="Hours"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">No data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Productivity Chart */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Productivity Trend</h2>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" domain={[0, 100]} />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="productivity"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                      name="Productivity %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">No data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleViewAttendance}
                className="group relative p-5 bg-white hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors duration-200">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-900 mb-1">View Attendance</h3>
                    <p className="text-sm text-slate-500">Detailed records</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors duration-200" />
                </div>
              </button>

              <button
                onClick={() => router.push(`/${company}/reports`)}
                className="group relative p-5 bg-white hover:bg-green-50 rounded-lg border border-slate-200 hover:border-green-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors duration-200">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-900 mb-1">View Reports</h3>
                    <p className="text-sm text-slate-500">Analytics & insights</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors duration-200" />
                </div>
              </button>

              <button
                onClick={() => router.push(`/${company}/monitoring`)}
                className="group relative p-5 bg-white hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors duration-200">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-900 mb-1">Monitoring</h3>
                    <p className="text-sm text-slate-500">Real-time tracking</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors duration-200" />
                </div>
              </button>
            </div>
          </div>
    </main>
  );
}