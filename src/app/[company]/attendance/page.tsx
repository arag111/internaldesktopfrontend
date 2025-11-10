'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/app/components/Navbar';
import CompanySidebar from '@/app/components/CompanySidebar';
import { baseUrl } from '@/app/utils/config';
import Attendance from '@/app/components/Attendance';
import moment from 'moment';
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, { status: string; timestamp: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const isInitialMount = useRef(true);
  const prevRangeRef = useRef<string>('');

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
    const rangeKey = `${format(start, 'yyyy-MM-dd')}-${format(end, 'yyyy-MM-dd')}`;
    
    // Skip if range hasn't changed (unless it's initial mount)
    if (!isInitialMount.current && prevRangeRef.current === rangeKey) {
      return;
    }
    prevRangeRef.current = rangeKey;
    isInitialMount.current = false;

    const toISTDate = (date: Date) => {
      const istOffset = 5.5 * 60;
      const utc = date.getTime() + date.getTimezoneOffset() * 60000;
      return new Date(utc + istOffset * 60000);
    };
    const istStart = toISTDate(start);
    const istEnd = toISTDate(end);

    const fetchData = async () => {
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

  // Memoize currentStats to avoid recalculation
  const currentStats = useMemo(() => {
    if (role === 'admin' || role === 'manager') {
      return allUserStats.find((u) => u.user.id === selectedUserId)?.stats || [];
    }
    return stats;
  }, [role, allUserStats, selectedUserId, stats]);

  const mlValue = role === 'admin' || role === 'manager' ? '32rem' : '16rem';

  // Memoize handlers
  const handleSetSelectedUserId = useCallback((id: number) => {
    setSelectedUserId(id);
  }, []);

  const handleSetSelectedRange = useCallback((range: [Date, Date]) => {
    setSelectedRange(range);
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <CompanySidebar />
        <Attendance
          role={role}
          allUserStats={allUserStats}
          selectedUserId={selectedUserId}
          setSelectedUserId={handleSetSelectedUserId}
          setSelectedRange={handleSetSelectedRange}
          selectedRange={selectedRange}
          currentStats={currentStats}
          rangePresets={rangePresets}
          userStatuses={userStatuses}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          mlValue="16rem"
        />
      </div>
    </div>
  );
}