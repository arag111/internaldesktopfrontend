'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Navbar from '@/app/components/Navbar';
import CompanySidebar from "@/app/components/CompanySidebar";
import axios from 'axios';
import { format } from 'date-fns';
import { baseUrl } from '@/app/utils/config';
import DateRangePickerComponent from '@/app/components/DateRangePicker2';
import ClaimsTable from '@/app/components/ClaimsTable';
import { rangePresets } from '@/app/utils/constants';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export default function ClaimsPage() {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [claims, setClaims] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedRange, setSelectedRange] = useState(rangePresets[0].range);
    const [allUserStats, setAllUserStats] = useState<any[]>([]);
    const [userStatuses, setUserStatuses] = useState<Record<string, { status: string; timestamp: string }>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);

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
                if (storedRole === 'admin' || storedRole === 'manager') {
                    setAllUserStats(data);
                    // Only set selectedUserId if it's not already set
                    if (selectedUserId === null && data.length > 0) {
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

            const handleStatusUpdate = ({ userId, status, timestamp }: { userId: string; status: string; timestamp: string }) => {
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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false);
                setLocalSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const mlValue = '16rem';
    
    // Memoize handlers
    const handleSetSelectedUserId = useCallback((id: string) => {
        setSelectedUserId(id);
    }, []);

    const handleSetSelectedRange = useCallback((range: [Date, Date]) => {
        setSelectedRange(range);
    }, []);
    
    // Memoize summary calculation
    const summary = useMemo(() => {
        const filteredClaims = claims.filter((claim) => !selectedUserId || claim.userId === selectedUserId);
        const allEvents = filteredClaims.flatMap(claim => claim.idleEvents || []);
        return {
            total: allEvents.length,
            pending: allEvents.filter(e => e.status === 'pending').length,
            approved: allEvents.filter(e => e.status === 'approved').length,
            rejected: allEvents.filter(e => e.status === 'rejected').length,
        };
    }, [claims, selectedUserId]);

    return (
        <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
            <Navbar />

            <div className="flex flex-1 overflow-hidden">
                <CompanySidebar />
                <ClaimsTable
                    claims={claims}
                    role={role}
                    selectedUserId={selectedUserId}
                    setSelectedUserId={handleSetSelectedUserId}
                    setSelectedRange={handleSetSelectedRange}
                    selectedRange={selectedRange}
                    rangePresets={rangePresets}
                    allUserStats={allUserStats}
                    userStatuses={userStatuses}
                    summary={summary}
                    mlValue={mlValue} />

            </div>
        </div>
    );
}
