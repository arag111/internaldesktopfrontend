'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';
import DateRangePickerComponent from './DateRangePicker2';
import moment from 'moment';
import { Check, X } from 'lucide-react';

interface ClaimsTableProps {
    claims: any[];
    selectedUserId: string | null;
    role: string | null;
    setSelectedRange: (range: any) => void;
    selectedRange: any;
    rangePresets: { label: string; range: any }[];
    mlValue: string;
}

const ClaimsTable: React.FC<ClaimsTableProps> = ({
    claims,
    selectedUserId,
    role,
    setSelectedRange,
    selectedRange,
    rangePresets,
    mlValue
}) => {
    const [localClaims, setLocalClaims] = useState(claims);

    useEffect(() => {
        setLocalClaims(claims);
    }, [claims]);

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
                        idleEvents: claim.idleEvents.map(event =>
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

    return (
        <main
            className={`ml-[32rem] mt-16 p-8 bg-gray-100 overflow-y-auto w-full`}
            style={{ marginLeft: mlValue }}
        >
            <div className="flex items-center gap-x-4 mb-6">
                <h2 className="text-lg font-semibold">Claim Records:</h2>
                <DateRangePickerComponent
                    selectedRange={selectedRange}
                    setSelectedRange={setSelectedRange}
                    rangePresets={rangePresets}
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse rounded-lg shadow text-sm">
                    <thead className="bg-[#075a96] text-white">
                        <tr className="text-left">
                            <th className="p-3">Started At</th>
                            <th className="p-3">Duration</th>
                            <th className="p-3">Comments</th>
                            <th className="p-3">Status</th>
                            {(role === 'admin' || role === 'manager') && <th className="p-3">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {localClaims
                            .filter((claim) => !selectedUserId || claim.userId === selectedUserId)
                            .map((claim) =>
                                claim.idleEvents.map((event) => (
                                    <tr key={event._id} className="border-b bg-white hover:bg-gray-50">
                                        <td className="p-3">{moment.utc(event.startedAt).format('DD-MM-YYYY hh:mm A')}</td>
                                        <td className="p-3">{formatDuration(event.startedAt, event.endedAt)}</td>
                                        <td className="p-3">{event.reason}</td>
                                        <td className="p-3 capitalize">{event.status}</td>
                                        {(role === 'admin' || role === 'manager') && (
                                            <td className="p-3 flex gap-2">
                                                {canAct(event.status) ? (
                                                    <>
                                                        <button
                                                            className="!text-green-600 !hover:text-green-800 !bg-green-100 !rounded-full !p-3"
                                                            title="Approve"
                                                            onClick={() =>
                                                                handleStatusUpdate(claim._id, event._id, 'approved')
                                                            }
                                                        >
                                                            <Check size={20} />
                                                        </button>
                                                        <button
                                                            className="!text-red-600 !hover:text-red-800 !bg-red-100 !rounded-full !p-3"
                                                            title="Reject"
                                                            onClick={() =>
                                                                handleStatusUpdate(claim._id, event._id, 'rejected')
                                                            }
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400 italic">No Actions</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                    </tbody>
                </table>
            </div>
        </main>
    );
};

export default ClaimsTable;
