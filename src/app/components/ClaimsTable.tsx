'use client';
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';
import DateRangePickerComponent from './DateRangePicker2';
import moment from 'moment';
import { Check, X, ChevronDown, Search, Clock, AlertCircle, CheckCircle, XCircle, Calendar, Users } from 'lucide-react';

interface ClaimsTableProps {
    claims: any[];
    selectedUserId: string | null;
    setSelectedUserId?: (id: string) => void;
    role: string | null;
    setSelectedRange: (range: any) => void;
    selectedRange: any;
    rangePresets: { label: string; range: any }[];
    allUserStats?: any[];
    userStatuses?: Record<string, { status: string; timestamp: string }>;
    summary?: { total: number; pending: number; approved: number; rejected: number };
    mlValue: string;
}

const ClaimsTable: React.FC<ClaimsTableProps> = ({
    claims,
    selectedUserId,
    setSelectedUserId,
    role,
    setSelectedRange,
    selectedRange,
    rangePresets,
    allUserStats = [],
    userStatuses = {},
    summary = { total: 0, pending: 0, approved: 0, rejected: 0 },
    mlValue
}) => {
    const [localClaims, setLocalClaims] = useState(claims);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const userDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalClaims(claims);
    }, [claims]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const formatDuration = (startedAt: string, endedAt: string | null) => {
        if (!startedAt) return 'Invalid start time';
        if (!endedAt) return 'Ongoing';

        const start = moment(startedAt);
        const end = moment(endedAt);
        const duration = moment.duration(end.diff(start));

        const hours = String(Math.floor(duration.asHours())).padStart(2, '0');
        const minutes = String(duration.minutes()).padStart(2, '0');
        const seconds = String(duration.seconds()).padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    };

    const handleStatusUpdate = async (claimId: string, eventId: string, status: string) => {
        if (role !== 'admin' && role !== 'manager') return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${baseUrl}/idle/update/${claimId}/${eventId}`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setLocalClaims(prev =>
                prev.map(claim => {
                    if (claim._id !== claimId) return claim;
                    return {
                        ...claim,
                        idleEvents: claim.idleEvents.map((event: any) =>
                            event._id === eventId ? { ...event, status } : event
                        )
                    };
                })
            );
        } catch (error) {
            console.error('Error updating claim status', error);
        }
    };

    const canAct = (eventStatus: string) => {
        if (role === 'admin') return true;
        if (role === 'manager' && eventStatus === 'pending') return true;
        return false;
    };

    const filteredClaims = localClaims.filter((claim) => !selectedUserId || claim.userId === selectedUserId);

    return (
        <main
            className={`mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-y-auto w-full`}
            style={{ marginLeft: mlValue }}
        >
            {/* Hero Banner Section */}
            <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 mb-0.5">
                                Time Claims
                            </h1>
                            <p className="text-sm text-slate-500">Manage and review time claim requests</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        {/* Date Range Picker */}
                        <DateRangePickerComponent
                            selectedRange={selectedRange}
                            setSelectedRange={setSelectedRange}
                            rangePresets={rangePresets}
                        />
                        {/* User Selection */}
                        {(role === 'admin' || role === 'manager') && setSelectedUserId && allUserStats.length > 0 && (
                            <div className="relative" ref={userDropdownRef}>
                                <button
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                    className="group relative flex items-center justify-between px-3 py-1.5 h-[38px] w-80 bg-white text-black rounded-md text-sm font-medium hover:bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-200"
                                >
                                    <span className="truncate">Select User</span>
                                    <ChevronDown className={`w-4 h-4 text-black transition-transform duration-200 flex-shrink-0 ${showUserDropdown ? 'transform rotate-180' : ''}`} />
                                </button>

                                {/* User Selector Dropdown */}
                                {showUserDropdown && (
                                    <div className="absolute top-full right-0 mt-1.5 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden w-80 z-50">
                                        {/* Search Input */}
                                        <div className="p-2.5 border-b border-slate-200 bg-white">
                                            <input
                                                type="text"
                                                placeholder="Search users..."
                                                value={localSearchTerm}
                                                onChange={(e) => setLocalSearchTerm(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all duration-200"
                                                autoFocus
                                            />
                                        </div>

                                        {/* "All" Category Bar */}
                                        <div className="bg-white border-b border-slate-200 px-2.5 py-2">
                                            <span className="text-sm font-semibold text-black">All</span>
                                        </div>

                                        {/* User List */}
                                        <div className="max-h-[400px] overflow-y-auto bg-white">
                                            {(() => {
                                                const filteredUsers = allUserStats.filter(({ user }) =>
                                                    !localSearchTerm || user.name.toLowerCase().includes(localSearchTerm.toLowerCase())
                                                );

                                                if (filteredUsers.length === 0) {
                                                    return (
                                                        <div className="p-8 text-center bg-white">
                                                            <p className="text-sm text-slate-500">No users found</p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="bg-white">
                                                        {filteredUsers.map(({ user }) => {
                                                            const isSelected = user.id === selectedUserId;
                                                            return (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => {
                                                                        setSelectedUserId(user.id);
                                                                        setShowUserDropdown(false);
                                                                        setLocalSearchTerm('');
                                                                    }}
                                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left bg-white hover:bg-white active:bg-white focus:bg-white border-b border-slate-100 last:border-b-0"
                                                                    style={{ backgroundColor: 'white' }}
                                                                >
                                                                    {/* Avatar Icon */}
                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border bg-white border-slate-200">
                                                                        <Users className="w-4 h-4 text-black" />
                                                                    </div>
                                                                    
                                                                    {/* User Name */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium truncate text-black">
                                                                            {user.name}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                    
                    {/* Quick Stats in Hero */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-600 mb-0.5">Total Claims</p>
                            <p className="text-lg font-semibold text-slate-900">{summary.total}</p>
                        </div>
                            </div>
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <div className="w-8 h-8 rounded-md bg-yellow-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-600 mb-0.5">Pending</p>
                            <p className="text-lg font-semibold text-slate-900">{summary.pending}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
                                    <div>
                            <p className="text-xs font-medium text-slate-600 mb-0.5">Approved</p>
                            <p className="text-lg font-semibold text-slate-900">{summary.approved}</p>
                                </div>
                            </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="w-8 h-8 rounded-md bg-red-100 flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-red-600" />
                                                </div>
                        <div>
                            <p className="text-xs font-medium text-slate-600 mb-0.5">Rejected</p>
                            <p className="text-lg font-semibold text-slate-900">{summary.rejected}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Claims Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Started At</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Ended At</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                                {(role === 'admin' || role === 'manager') && (
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white text-slate-700 text-sm divide-y divide-slate-200">
                            {filteredClaims.length === 0 ? (
                                <tr>
                                    <td colSpan={(role === 'admin' || role === 'manager') ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="w-8 h-8 text-slate-400" />
                                            <p className="text-sm font-medium">No claims found</p>
                                            <p className="text-xs text-slate-400">Try adjusting your filters or date range</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredClaims.flatMap((claim, claimIndex) =>
                                    claim.idleEvents?.map((event: any, eventIndex: number) => {
                                        const statusColors = {
                                            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                                            approved: 'bg-green-100 text-green-800 border-green-300',
                                            rejected: 'bg-red-100 text-red-800 border-red-300'
                                        };
                                        const statusIcons = {
                                            pending: <Clock className="w-4 h-4" />,
                                            approved: <CheckCircle className="w-4 h-4" />,
                                            rejected: <XCircle className="w-4 h-4" />
                                        };

                                        return (
                                            <tr key={`${claimIndex}-${eventIndex}`} className="hover:bg-slate-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {moment(event.startedAt).format('DD-MM-YYYY')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {moment(event.startedAt).format('hh:mm A')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {event.endedAt ? moment(event.endedAt).format('hh:mm A') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium">
                                                    {formatDuration(event.startedAt, event.endedAt)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[event.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                                                        {statusIcons[event.status as keyof typeof statusIcons]}
                                                        {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                                                    </span>
                                                </td>
                                                {(role === 'admin' || role === 'manager') && (
                                                    <td className="px-6 py-4">
                                                        {canAct(event.status) ? (
                                                            <div className="flex gap-2 justify-center">
                                                                <button
                                                                    className="w-8 h-8 rounded-md bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700 flex items-center justify-center transition-colors duration-200"
                                                                    title="Approve"
                                                                    onClick={() => handleStatusUpdate(claim._id, event._id, 'approved')}
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    className="w-8 h-8 rounded-md bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 flex items-center justify-center transition-colors duration-200"
                                                                    title="Reject"
                                                                    onClick={() => handleStatusUpdate(claim._id, event._id, 'rejected')}
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-xs">No Actions</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
};

export default ClaimsTable;