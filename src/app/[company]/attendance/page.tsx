'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';
import { formatISTDateRange } from '@/app/utils/timezone';
import Attendance from '@/app/components/Attendance';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { rangePresets } from '@/app/utils/constants';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface UserStats {
  user: {
    id: number;
    name: string;
    email: string;
  };
  stats: any[];
}

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;

  const [stats, setStats] = useState<any[]>([]);
  const [allUserStats, setAllUserStats] = useState<UserStats[]>([]);
  const [selectedRange, setSelectedRange] = useState(rangePresets[0].range);
  const [role, setRole] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, { status: string; timestamp: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const isInitialMount = useRef(true);
  const prevRangeRef = useRef<string>('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; name: string; email: string }[]>([]);

  // Initialize role from localStorage on mount
  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);
  }, []);

  // Fetch available users for filtering (admin/manager only)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');

    if (!token) return;

    const controller = new AbortController();

    if (storedRole === 'admin' || storedRole === 'manager') {
      const fetchUsers = async () => {
        try {
          const { data } = await axios.get(
            `${baseUrl}/api/users/company-users`,
            { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
          );
          setAvailableUsers(data.users || []);
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error('Failed to fetch users for filtering:', error);
          }
        }
      };
      fetchUsers();
    }

    return () => controller.abort();
  }, [role]);

  // Fetch data when range changes (not when selectedUserId changes)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (!token) {
      router.push('/');
      return;
    }

    const [start, end] = selectedRange;
    const rangeKey = `${format(start, 'yyyy-MM-dd')}-${format(end, 'yyyy-MM-dd')}`;

    // Skip if range hasn't changed (unless it's initial mount)
    if (!isInitialMount.current && prevRangeRef.current === rangeKey) {
      return;
    }
    prevRangeRef.current = rangeKey;
    isInitialMount.current = false;

    const controller = new AbortController();

    // ✅ Use centralized IST utility instead of duplicate function
    const dateRange = formatISTDateRange(start, end);

    const fetchData = async () => {
      try {
        if (storedRole === 'admin' || storedRole === 'manager') {
          const { data } = await axios.get(
            `${baseUrl}/api/activity/all-users?start=${dateRange.start}&end=${dateRange.end}`,
            { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
          );
          setAllUserStats(data);
        } else {
          const { getUserIdFromToken } = await import('@/app/utils/jwt');
          const userId = getUserIdFromToken(token);
          const { data } = await axios.get(
            `${baseUrl}/api/activity/range/${userId}?start=${dateRange.start}&end=${dateRange.end}`,
            { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
          );
          // Backend now returns wrapped format: [{ user: {...}, stats: [...] }]
          // Store in allUserStats for consistency with admin/manager flow
          setAllUserStats(data);
          setStats(data);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Failed to fetch data:', error);
        }
      }
    };

    fetchData();

    return () => controller.abort();
  }, [router, selectedRange]);

  // Socket connection management
  useEffect(() => {
    if (role === 'admin' || role === 'manager') {
      const token = localStorage.getItem('token');
      if (!token) return;

      const socketInstance = io(baseUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const handleStatusUpdate = ({ userId, status, timestamp }: { userId: number; status: string; timestamp: string }) => {
        setUserStatuses((prev) => ({
          ...prev,
          [userId]: { status, timestamp },
        }));
      };

      socketInstance.on('status:update', handleStatusUpdate);
      setSocket(socketInstance);

      return () => {
        socketInstance.off('status:update', handleStatusUpdate);
        socketInstance.disconnect();
      };
    }
  }, [role]);

  const mlValue = role === 'admin' || role === 'manager' ? '32rem' : '16rem';

  // Memoize handlers to prevent re-renders
  const handleSetSelectedRange = useCallback((range: [Date, Date]) => {
    setSelectedRange(range);
  }, []);

  const handleSetSelectedUsers = useCallback((users: number[]) => {
    setSelectedUsers(users);
  }, []);

  const handleSetSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  return (
    <Attendance
      role={role}
      allUserStats={allUserStats}
      selectedUserId={null}
      setSelectedRange={handleSetSelectedRange}
      selectedRange={selectedRange}
      currentStats={stats}
      rangePresets={rangePresets}
      userStatuses={userStatuses}
      searchTerm={searchTerm}
      setSearchTerm={handleSetSearchTerm}
      mlValue="16rem"
      selectedUsers={selectedUsers}
      setSelectedUsers={handleSetSelectedUsers}
      availableUsers={availableUsers}
    />
  );
}