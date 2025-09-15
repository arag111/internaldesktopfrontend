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
import { Download, MoreVertical } from 'lucide-react';

interface AttendanceProps {
    role: string | null;
    allUserStats: any[];
    selectedUserId: string | null;
    setSelectedRange: (range: any) => void;
    selectedRange: any;
    currentStats: any[];
    rangePresets: { label: string; range: any }[];
    mlValue: string;
}

const Attendance: React.FC<AttendanceProps> = ({
    role,
    allUserStats,
    selectedUserId,
    setSelectedRange,
    selectedRange,
    currentStats,
    rangePresets,
    mlValue,
}) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
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
            render: (s: any) => s.punchInTime ? moment.utc(s.punchInTime).format('hh:mm A') : '-'
        },
        {
            label: 'Last Seen',
            tooltip: 'Last active timestamp',
            render: (s: any) => s.lastSeen 
  ? (moment.utc(s.lastSeen).format('HH:mm') === moment.utc(new Date(Date.now() + 5.5 * 60 * 60 * 1000)).format('HH:mm')
      ? 'Active Now'
      : moment.utc(s.lastSeen).format('hh:mm A'))
  : '-'
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
                s.punchInTime ? moment.utc(s.punchInTime).format('hh:mm A') : '-',
                s.lastSeen ? moment.utc(s.lastSeen).format('hh:mm A') : '-',
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

    return (
        <main
            className={`ml-[32rem] mt-16 p-8 bg-gray-100 overflow-y-auto w-full`}
            style={{ marginLeft: mlValue }}
        >
            <h1 className="text-xl font-semibold mt-0 mb-4 text-[#075a96]">
                {role === 'admin' || role === 'manager'
                    ? `${allUserStats.find((u) => u.user.id === selectedUserId)?.user.name}`
                    : ''}
            </h1>
            <div className="flex items-center gap-x-4 mb-6">
                <h2 className="text-lg font-semibold">Attendance Records:</h2>
                <DateRangePickerComponent
                    selectedRange={selectedRange}
                    setSelectedRange={setSelectedRange}
                    rangePresets={rangePresets}
                />
                {/* Export Dropdown Button */}
                <div className="relative ml-auto" ref={exportRef}>
                    <button
                        onClick={() => setShowExportMenu(prev => !prev)}
                        className="!bg-white !text-gray-800 !border !border-gray-300 !px-3 !py-2 !rounded-md !shadow-sm hover:!bg-gray-100 flex items-center"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    {showExportMenu && (
    <div className="absolute right-0 mt-2 w-36 !bg-white !text-gray-800 !border !rounded-md !shadow-md z-50 p-2 space-y-2">
        <button
            onClick={() => {
                exportToExcel();
                setShowExportMenu(false);
            }}
            className="w-full text-left !bg-white !text-gray-800 px-4 py-2 rounded hover:!bg-gray-100 text-sm"
        >
            Export to Excel
        </button>
        <button
            onClick={() => {
                exportToPDF();
                setShowExportMenu(false);
            }}
            className="w-full text-left !bg-white !text-gray-800 px-4 py-2 rounded hover:!bg-gray-100 text-sm"
        >
            Export to PDF
        </button>
        <button
            onClick={() => {
                exportToCSV();
                setShowExportMenu(false);
            }}
            className="w-full text-left !bg-white !text-gray-800 px-4 py-2 rounded hover:!bg-gray-100 text-sm"
        >
            Export to CSV
        </button>
    </div>
)}

                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse rounded-lg shadow">
                    <thead className="bg-[#075a96] text-white">
                        <tr>
                            {columns.map(({ label, tooltip }) => (
                                <th
                                    key={label}
                                    className="relative group px-3 py-3 font-semibold text-sm text-left"
                                >
                                    {label}
                                    <div className="absolute z-10 hidden group-hover:block bg-gray-100 text-gray-700 text-xs font-bold rounded px-2 py-1 mt-1 whitespace-nowrap">
                                        {tooltip}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white text-gray-700 text-sm">
                        {currentStats.map((s, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                                {columns.map(({ label, render }) => (
                                    <td key={label} className={`px-3 py-3 ${render(s) === 'Active Now' ? 'text-green-700' : ''}`}>{render(s)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {currentStats.length > 0 && (
                <div className="mt-10">
                    <h2 className="text-xl font-semibold mb-4">Productivity Overview</h2>
                    <div className="w-full h-80 bg-white rounded-lg shadow p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={currentStats.map((s) => ({
                                    date: s.date,
                                    working: (
                                        (s.workingTimeInSeconds - s.rejectedIdleTimeInSeconds) /
                                        3600
                                    ).toFixed(2),
                                    break: (s.breakTimeInSeconds / 3600).toFixed(2),
                                    idle: (s.idleTimeInSeconds / 3600).toFixed(2),
                                }))}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis unit="h" />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="working" name="Working Hours" fill="#60a5fa" />
                                <Bar dataKey="break" name="Break Hours" fill="#facc15" />
                                <Bar dataKey="idle" name="Idle Hours" fill="#f87171" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Attendance;
