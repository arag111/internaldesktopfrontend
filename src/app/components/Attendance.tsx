'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import moment from 'moment';
import DateRangePickerComponent from './DateRangePicker2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, ChevronDown, Search, Check, X, Clock, TrendingUp, Calendar, BarChart3, Users } from 'lucide-react';

interface AttendanceProps {
    role: string | null;
    allUserStats: any[];
    selectedUserId: number | null;
    setSelectedUserId?: (id: number) => void;
    setSelectedRange: (range: any) => void;
    selectedRange: any;
    currentStats: any[];
    rangePresets: { label: string; range: any }[];
    userStatuses?: Record<string, { status: string; timestamp: string }>;
    searchTerm?: string;
    setSearchTerm?: (term: string) => void;
    mlValue: string;
}

const Attendance: React.FC<AttendanceProps> = ({
    role,
    allUserStats,
    selectedUserId,
    setSelectedUserId,
    setSelectedRange,
    selectedRange,
    currentStats,
    rangePresets,
    userStatuses = {},
    searchTerm = '',
    setSearchTerm,
    mlValue,
}) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const exportRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h:${mins}m`;
    };

    const columns = [
        {
            label: 'Date',
            tooltip: 'The date of the record',
            render: (s: any) => moment(s.date).format('DD-MM-YY')
        },
        {
            label: 'Punching Time',
            tooltip: 'Employee First Login time',
            render: (s: any) => s.punchInTime ? moment(s.punchInTime).utcOffset('+05:30').format('hh:mm A') : '-'
        },
        {
            label: 'Last Seen',
            tooltip: 'Last active timestamp',
            render: (s: any) => {
                if (!s.lastSeen) return '-';
                const lastSeenTime = moment(s.lastSeen).utcOffset('+05:30');
                const currentTime = moment().utcOffset('+05:30');
                // FIXED: Check if within last 5 minutes, not just same time
                const minutesDiff = currentTime.diff(lastSeenTime, 'minutes');
                if (minutesDiff >= 0 && minutesDiff <= 5) {
                    return 'Active Now';
                }
                return lastSeenTime.format('hh:mm A');
            }
        },
        {
            label: 'Working Hours',
            tooltip: 'Total punch In/Out time - Rejected idle time',
            render: (s: any) => formatDuration((s.workingTimeInSeconds || 0) - (s.rejectedIdleTimeInSeconds || 0))
        },
        {
            label: 'Break Hours',
            tooltip: 'Total break time taken',
            render: (s: any) => formatDuration(s.breakTimeInSeconds || 0)
        },
        {
            label: 'Idle Hours',
            tooltip: 'Total idle time detected',
            render: (s: any) => formatDuration(s.idleTimeInSeconds || 0)
        },
        {
            label: 'Productive Hours',
            tooltip: 'Working hours - Break Time',
            render: (s: any) => {
                const working = s.workingTimeInSeconds || 0;
                const idle = s.idleTimeInSeconds || 0;
                const totalBreak = s.breakTimeInSeconds || 0;
                const displayWorking = working - s.rejectedIdleTimeInSeconds;
                const productive = displayWorking - totalBreak > 0 ? displayWorking - totalBreak : 0;
                return formatDuration(productive);
            }
        }
    ];

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance');

        worksheet.addRow(columns.map(col => col.label));
        currentStats.forEach(s => {
            const row = columns.map(col => col.render(s));
            worksheet.addRow(row);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, 'Attendance_Report.xlsx');
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableColumn = columns.map((col) => col.label);
        const tableRows = currentStats.map((s) => {
            const working = s.workingTimeInSeconds || 0;
            const totalBreak = s.breakTimeInSeconds || 0;
            const idle = s.idleTimeInSeconds || 0;
            const displayWorking = working - idle;
            const productive = Math.max(displayWorking - totalBreak, 0);

            return [
                moment(s.date).format('DD-MM-YY'),
                s.punchInTime ? moment(s.punchInTime).utcOffset('+05:30').format('hh:mm A') : '-',
                s.lastSeen ? moment(s.lastSeen).utcOffset('+05:30').format('hh:mm A') : '-',
                formatDuration(displayWorking),
                formatDuration(totalBreak),
                formatDuration(idle),
                formatDuration(productive),
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
        });

        doc.save('attendance.pdf');
    };

    const exportToCSV = () => {
        const headers = columns.map(col => col.label).join(',');
        const rows = currentStats.map(s => columns.map(col => col.render(s)).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'Attendance_Report.csv');
    };

    // Calculate summary stats
    const calculateSummary = () => {
        if (!currentStats || currentStats.length === 0) {
            return { totalHours: 0, avgHours: 0, attendanceDays: 0 };
        }
        const totalSeconds = currentStats.reduce((sum: number, s: any) => {
            return sum + ((s.workingTimeInSeconds || 0) - (s.rejectedIdleTimeInSeconds || 0));
        }, 0);
        const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
        const avgHours = currentStats.length > 0 ? Math.round((totalHours / currentStats.length) * 10) / 10 : 0;
        const attendanceDays = currentStats.filter((s: any) => (s.workingTimeInSeconds || 0) > 0).length;
        return { totalHours, avgHours, attendanceDays };
    };

    const summary = calculateSummary();

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
                            <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 mb-0.5">
                                Attendance Records
                            </h1>
                            <p className="text-sm text-slate-500">Detailed attendance tracking and productivity analysis</p>
                        </div>
                        </div>
                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                            {/* User Selection */}
                            {(role === 'admin' || role === 'manager') && setSelectedUserId && allUserStats.length > 0 && (
                                <div className="relative" ref={userDropdownRef}>
                                    <button
                                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                                        className="group relative flex items-center justify-between px-3 py-1.5 h-[38px] w-80 bg-white text-black rounded-md text-sm font-medium hover:bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-200"
                                    >
                                        <span className="truncate">
                                            {selectedUserId 
                                                ? allUserStats.find(({ user }) => user.id === selectedUserId)?.user.name || 'Select User'
                                                : 'Select User'
                                            }
                                        </span>
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
                            {/* Date Range Picker */}
                            <DateRangePickerComponent
                                selectedRange={selectedRange}
                                setSelectedRange={setSelectedRange}
                                rangePresets={rangePresets}
                            />
                            {/* Export Dropdown Button */}
                            <div className="relative" ref={exportRef}>
                                <button
                                    onClick={() => setShowExportMenu(prev => !prev)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-200"
                                >
                                    <Download className="w-4 h-4 text-black" />
                                    <span>Export</span>
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                                        <button
                                            onClick={() => {
                                                exportToExcel();
                                                setShowExportMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors duration-200 border-b border-slate-100"
                                        >
                                            Export to Excel
                                        </button>
                                        <button
                                            onClick={() => {
                                                exportToPDF();
                                                setShowExportMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors duration-200 border-b border-slate-100"
                                        >
                                            Export to PDF
                                        </button>
                                        <button
                                            onClick={() => {
                                                exportToCSV();
                                                setShowExportMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors duration-200"
                                        >
                                            Export to CSV
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Quick Stats in Hero */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-600 mb-0.5">Total Hours</p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {summary.totalHours}h
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="w-8 h-8 rounded-md bg-emerald-100 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-600 mb-0.5">Average Hours/Day</p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {summary.avgHours}h
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                            <div>
                                <p className="text-xs font-medium text-slate-600 mb-0.5">Attendance Days</p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {summary.attendanceDays}/{currentStats.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Enhanced Data Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            {columns.map(({ label, tooltip }) => (
                                <th
                                    key={label}
                                        className="relative group px-4 py-3 font-semibold text-xs text-slate-700 text-left uppercase tracking-wide"
                                >
                                    {label}
                                        <div className="absolute z-20 hidden group-hover:block bg-slate-900 text-white text-xs font-medium rounded-lg px-3 py-2 mt-2 whitespace-nowrap shadow-lg border border-slate-700">
                                        {tooltip}
                                            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 transform rotate-45 border-l border-t border-slate-700"></div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white text-slate-700 text-sm">
                        {currentStats.map((s, i) => (
                                <tr 
                                    key={i} 
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-200"
                                >
                                {columns.map(({ label, render }) => (
                                        <td 
                                            key={label} 
                                            className={`px-4 py-3 ${
                                                render(s) === 'Active Now' 
                                                    ? 'text-green-600 font-semibold' 
                                                    : 'text-slate-700'
                                            }`}
                                        >
                                            {render(s)}
                                        </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
            {currentStats.length > 0 && (
                <div className="bg-white rounded-lg p-5 border border-slate-200">
                    <div className="flex items-center gap-2.5 mb-6">
                        <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                            <h2 className="text-base font-semibold text-slate-900">Productivity Overview</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Visual breakdown of working hours, breaks, and idle time</p>
                        </div>
                    </div>
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={currentStats.map((s) => ({
                                    date: moment(s.date).format('MMM DD'),
                                    working: parseFloat((
                                        ((s.workingTimeInSeconds || 0) - (s.rejectedIdleTimeInSeconds || 0)) /
                                        3600
                                    ).toFixed(2)),
                                    break: parseFloat(((s.breakTimeInSeconds || 0) / 3600).toFixed(2)),
                                    idle: parseFloat(((s.idleTimeInSeconds || 0) / 3600).toFixed(2)),
                                }))}
                                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="workingGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                    </linearGradient>
                                    <linearGradient id="breakGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#eab308" stopOpacity={0.8}/>
                                        <stop offset="100%" stopColor="#eab308" stopOpacity={0.4}/>
                                    </linearGradient>
                                    <linearGradient id="idleGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis 
                                    unit="h" 
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    width={40}
                                />
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        fontSize: '12px',
                                        padding: '8px 12px'
                                    }}
                                    cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }}
                                />
                                <Legend 
                                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 500 }}
                                    iconType="circle"
                                />
                                <Bar dataKey="working" name="Working Hours" fill="url(#workingGradient)" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="break" name="Break Hours" fill="url(#breakGradient)" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="idle" name="Idle Hours" fill="url(#idleGradient)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Attendance;
