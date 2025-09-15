'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/app/components/Navbar';
import CompanySidebar from '@/app/components/CompanySidebar';
import { baseUrl } from '@/app/utils/config';
import Attendance from '@/app/components/Attendance';
import UserSidebar from '@/app/components/UserSidebar';
import moment from 'moment';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import { rangePresets } from '@/app/utils/constants';

const socket = io(baseUrl);

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

export default function CompanyDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;

  const [stats, setStats] = useState([]);
  const [allUserStats, setAllUserStats] = useState([]);
  const [selectedRange, setSelectedRange] = useState(rangePresets[0].range);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [role, setRole] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});

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
    };

    fetchData();
  }, [router, selectedRange, selectedUserId]);

  useEffect(() => {
    if (role === 'admin' || role === 'manager') {
      const token = localStorage.getItem('token');
      if (!token) return;

      const handleStatusUpdate = ({ userId, status, timestamp }) => {
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
  const mlValue = role === 'admin' || role === 'manager' ? '32rem' : '16rem';

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <CompanySidebar />
        {role === 'admin' || role === 'manager' ? (
          <UserSidebar
            allUserStats={allUserStats}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            userStatuses={userStatuses}
          />
        ) : null}
        <Attendance
          role={role}
          allUserStats={allUserStats}
          selectedUserId={selectedUserId}
          setSelectedRange={setSelectedRange}
          selectedRange={selectedRange}
          currentStats={currentStats}
          rangePresets={rangePresets}
          mlValue={mlValue}
        />
      </div>
    </div>
  );
}