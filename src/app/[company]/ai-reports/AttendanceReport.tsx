'use client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Mail, Loader2 } from 'lucide-react';

interface AttendanceRecord {
  userId: number;
  userName: string;
  userEmail: string;
  jobRole: string;
  date: string;
  punchInTime: string;
  punchInTimeFormatted: string;
  punchInIpAddress: string;
  minutesFromStart: number;
  status: string;
  statusColor: string;
  location: string;
  locationColor: string;
}

interface UserAttendance {
  user: {
    id: number;
    name: string;
    email: string;
    jobRole: string;
  };
  records: AttendanceRecord[];
  stats: {
    totalDays: number;
    onTimeCount: number;
    lateCount: number;
    officeCount: number;
    remoteCount: number;
  };
}

interface AttendanceData {
  period: string;
  startDate: string;
  endDate: string;
  totalRecords: number;
  attendance: UserAttendance[];
}

type Period = 'day' | 'week' | 'month';

export default function AttendanceReport() {
  const [period, setPeriod] = useState<Period>('week');
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const [officeIp, setOfficeIp] = useState<string | null>(null);

  useEffect(() => {
    loadAttendanceReport();
  }, [period]);

  const loadAttendanceReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5002';
      const response = await fetch(`${API_BASE_URL}/api/attendance/report?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load attendance report');
      }

      const data = await response.json();
      setAttendanceData(data);
    } catch (err: any) {
      console.error('Error loading attendance report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (userId: number, email: string) => {
    try {
      setSendingEmail(userId);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5002';

      const response = await fetch(`${API_BASE_URL}/api/attendance/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          email,
          period
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      alert(`Attendance report sent to ${email}`);
    } catch (err: any) {
      console.error('Error sending email:', err);
      alert('Failed to send email: ' + err.message);
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusBadgeClass = (statusColor: string) => {
    switch (statusColor) {
      case 'green': return 'bg-green-100 text-green-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLocationBadgeClass = (locationColor: string) => {
    switch (locationColor) {
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'gray': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get all unique dates from all records
  const getAllDates = () => {
    if (!attendanceData) return [];
    const dateSet = new Set<string>();
    attendanceData.attendance.forEach(userAttendance => {
      userAttendance.records.forEach(record => {
        dateSet.add(record.date);
      });
    });
    return Array.from(dateSet).sort().reverse(); // Most recent first
  };

  const allDates = getAllDates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Attendance Report
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Track punctuality and work location
            {officeIp && ` (Office IP: ${officeIp})`}
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'day'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'week'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'month'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Attendance Data */}
      {!loading && !error && attendanceData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{attendanceData.totalRecords}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-green-600">
                {attendanceData.attendance.reduce((sum, u) => sum + u.stats.onTimeCount, 0)}
              </div>
              <div className="text-sm text-gray-600">On Time / Early</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-red-600">
                {attendanceData.attendance.reduce((sum, u) => sum + u.stats.lateCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Late</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-blue-600">
                {attendanceData.attendance.reduce((sum, u) => sum + u.stats.officeCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Office Days</div>
            </div>
          </div>

          {/* Columnar Attendance Table */}
          {attendanceData.attendance.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      {/* User Info Column */}
                      <th className="sticky left-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 text-left border-r border-gray-200">
                        <div className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                          Employee Details
                        </div>
                      </th>

                      {/* Stats Columns */}
                      <th className="px-4 py-4 text-center border-r border-gray-200">
                        <div className="text-xs font-medium text-gray-500 uppercase">Days</div>
                      </th>
                      <th className="px-4 py-4 text-center border-r border-gray-200">
                        <div className="text-xs font-medium text-gray-500 uppercase">On-Time</div>
                      </th>
                      <th className="px-4 py-4 text-center border-r border-gray-200">
                        <div className="text-xs font-medium text-gray-500 uppercase">Late</div>
                      </th>
                      <th className="px-4 py-4 text-center border-r-2 border-gray-300">
                        <div className="text-xs font-medium text-gray-500 uppercase">Office</div>
                      </th>

                      {/* Date Columns */}
                      {allDates.map((date) => (
                        <th key={date} className="px-6 py-4 text-center border-r border-gray-200 min-w-[200px]">
                          <div className="text-xs font-medium text-gray-900">
                            {format(new Date(date), 'MMM dd, yyyy')}
                          </div>
                        </th>
                      ))}

                      {/* Email Action Column */}
                      <th className="px-4 py-4 text-center">
                        <div className="text-xs font-medium text-gray-500 uppercase">Action</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendanceData.attendance.map((userAttendance) => {
                      // Create a map of date -> record for quick lookup
                      const recordsByDate = new Map(
                        userAttendance.records.map(r => [r.date, r])
                      );

                      return (
                        <tr key={userAttendance.user.id} className="hover:bg-gray-50">
                          {/* User Info */}
                          <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-gray-200">
                            <div className="min-w-[200px]">
                              <div className="font-semibold text-gray-900">{userAttendance.user.name}</div>
                              <div className="text-sm text-gray-600">{userAttendance.user.jobRole}</div>
                              <div className="text-xs text-gray-500 mt-1">{userAttendance.user.email}</div>
                            </div>
                          </td>

                          {/* Stats */}
                          <td className="px-4 py-4 text-center border-r border-gray-200">
                            <span className="font-medium text-gray-700">{userAttendance.stats.totalDays}</span>
                          </td>
                          <td className="px-4 py-4 text-center border-r border-gray-200">
                            <span className="font-medium text-green-600">{userAttendance.stats.onTimeCount}</span>
                          </td>
                          <td className="px-4 py-4 text-center border-r border-gray-200">
                            <span className="font-medium text-red-600">{userAttendance.stats.lateCount}</span>
                          </td>
                          <td className="px-4 py-4 text-center border-r-2 border-gray-300">
                            <span className="font-medium text-blue-600">{userAttendance.stats.officeCount}</span>
                          </td>

                          {/* Date Records */}
                          {allDates.map((date) => {
                            const record = recordsByDate.get(date);

                            return (
                              <td key={date} className="px-6 py-4 border-r border-gray-200">
                                {record ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-sm">
                                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="font-medium text-gray-900">{record.punchInTimeFormatted}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(record.statusColor)}`}>
                                        {record.status}
                                      </span>
                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getLocationBadgeClass(record.locationColor)}`}>
                                        {record.location}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                      <MapPin className="w-3 h-3" />
                                      <span className="font-mono">{record.punchInIpAddress}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-400 text-xs">-</div>
                                )}
                              </td>
                            );
                          })}

                          {/* Email Button */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => handleSendEmail(userAttendance.user.id, userAttendance.user.email)}
                              disabled={sendingEmail === userAttendance.user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {sendingEmail === userAttendance.user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span className="whitespace-nowrap">Email</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
              <p className="text-gray-500">
                No attendance records found for the selected period
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
