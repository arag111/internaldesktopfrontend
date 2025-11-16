'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Sidebar from '@/app/components/Sidebar';
import UserSidebar from '@/app/components/UserSidebar';
import axios from 'axios';
import { format } from 'date-fns';
import { baseUrl } from '@/app/utils/config';
import DateRangePickerComponent from '@/app/components/DateRangePicker2';
import ClaimsTable from '../components/ClaimsTable';
import { rangePresets } from '../utils/constants';

export default function ClaimsPage() {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [claims, setClaims] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedRange, setSelectedRange] = useState(rangePresets[0].range);
    const [allUserStats, setAllUserStats] = useState<any[]>([]);
    const [userStatuses, setUserStatuses] = useState<Record<string, { status: string; timestamp: string }>>({});

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role');
        setRole(storedRole);

        if (!token) return router.push('/');

        const fetchData = async () => {
            try {
                const [start, end] = selectedRange.map((date) =>
                    format(date, 'yyyy-MM-dd')
                );
                const userId = JSON.parse(atob(token.split('.')[1])).id;
                const url =
                    storedRole === 'admin' || storedRole === 'manager'
                        ? `${baseUrl}/idle/all?start=${start}&end=${end}`
                        : `${baseUrl}/idle/user/${userId}?start=${start}&end=${end}`;
                const { data } = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('Fetched claims data:', data);
                if (storedRole === 'admin' || storedRole === 'manager') {
                    setAllUserStats(data);
                    if (!selectedUserId && data.length > 0) {
                        setSelectedUserId(data[0].user.id);
                    }
                    const filteredActivities = data.flatMap((userObj: { activities: any[]; user: any; }) => {
                        return userObj.activities
                            .filter(activity => activity.idleEvents && activity.idleEvents.length > 0)
                            .map((activity: any) => ({
                                ...activity,
                                user: userObj.user
                            }));
                    });
                    setClaims(filteredActivities || []);
                } else {
                    setClaims(data || []);
                }
            } catch (error) {
                console.error('Error fetching claims', error);
            }
        };

        fetchData();
    }, [router, selectedRange, selectedUserId]);
    const mlValue = role === 'admin' || role === 'manager' ? '32rem' : '16rem';
    return (
        <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
            <Navbar />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                {role === 'admin' || role === 'manager' ? (
                    <UserSidebar
                        allUserStats={allUserStats}
                        selectedUserId={selectedUserId}
                        setSelectedUserId={setSelectedUserId}
                        userStatuses={userStatuses}
                    />
                ) : null}
                <ClaimsTable
                    claims={claims}
                    setClaims={setClaims}
                    role={role}
                    selectedUserId={selectedUserId}
                    setSelectedRange={setSelectedRange}
                    selectedRange={selectedRange}
                    rangePresets={rangePresets}
                    mlValue={mlValue} />

            </div>
        </div>
    );
}
