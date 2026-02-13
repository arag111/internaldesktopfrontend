'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { format } from 'date-fns';
import { baseUrl } from '@/app/utils/config';
import DateRangePickerComponent from '@/app/components/DateRangePicker2';
import ClaimsTable from '@/app/components/ClaimsTable';
import { rangePresets } from '@/app/utils/constants';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { toISTDate } from '@/app/utils/timezone';

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
    const hasRestoredFromStorage = useRef(false);

    // Initialize role from localStorage on mount
    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        setRole(storedRole);
        hasRestoredFromStorage.current = true;
    }, []);

    // Fetch data when range changes (not when selectedUserId changes)
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role');
        if (!token) {
            router.push('/');
            return;
        }

        const controller = new AbortController();

        const fetchData = async () => {
            try {
                // FIXED: Apply IST timezone conversion before formatting dates
                const [start, end] = selectedRange.map((date) =>
                    format(toISTDate(date), 'yyyy-MM-dd')
                );
                const userId = JSON.parse(atob(token.split('.')[1])).id;
                const url =
                    storedRole === 'admin' || storedRole === 'manager'
                        ? `${baseUrl}/idle/all?start=${start}&end=${end}`
                        : `${baseUrl}/idle/user/${userId}?start=${start}&end=${end}`;
                const { data } = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (storedRole === 'admin' || storedRole === 'manager') {
                    setAllUserStats(data);
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
                if (!axios.isCancel(error)) {
                    console.error('Error fetching claims', error);
                }
            }
        };

        fetchData();

        // ✅ OPTIMIZED: Reduced polling from 5s to 30s (immediate refresh on claim update handles real-time needs)
        const intervalId = setInterval(fetchData, 30000);

        return () => {
            controller.abort();
            clearInterval(intervalId);
        };
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

    // ✅ NEW: Create a callback to trigger immediate data refresh
    const handleClaimUpdated = useCallback(async () => {
        console.log('🔄 Claim updated - fetching fresh data immediately');
        try {
            const token = localStorage.getItem('token');
            const storedRole = localStorage.getItem('role');
            const [start, end] = selectedRange.map((date) =>
                format(toISTDate(date), 'yyyy-MM-dd')
            );
            const userId = JSON.parse(atob(token!.split('.')[1])).id;
            const url =
                storedRole === 'admin' || storedRole === 'manager'
                    ? `${baseUrl}/idle/all?start=${start}&end=${end}`
                    : `${baseUrl}/idle/user/${userId}?start=${start}&end=${end}`;
            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (storedRole === 'admin' || storedRole === 'manager') {
                setAllUserStats(data);
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
            console.log('✅ Fresh data loaded successfully');
        } catch (error) {
            console.error('❌ Error refreshing claims after update', error);
        }
    }, [selectedRange]);

    // Memoize summary calculation
    const summary = useMemo(() => {
        const filteredClaims = claims.filter((claim) => !selectedUserId || String(claim.userId) === selectedUserId);
        const allEvents = filteredClaims.flatMap(claim => claim.idleEvents || []);
        return {
            total: allEvents.length,
            pending: allEvents.filter(e => e.status === 'pending').length,
            approved: allEvents.filter(e => e.status === 'approved').length,
            rejected: allEvents.filter(e => e.status === 'rejected').length,
        };
    }, [claims, selectedUserId]);

    return (
        <ClaimsTable
            claims={claims}
            setClaims={setClaims}
            role={role}
            selectedUserId={selectedUserId}
            setSelectedUserId={handleSetSelectedUserId}
            setSelectedRange={handleSetSelectedRange}
            selectedRange={selectedRange}
            rangePresets={rangePresets}
            allUserStats={allUserStats}
            userStatuses={userStatuses}
            summary={summary}
            mlValue={mlValue}
            onClaimUpdated={handleClaimUpdated} />
    );
}
