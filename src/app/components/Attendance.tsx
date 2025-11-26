'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { subDays } from 'date-fns';
import {
    Button,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    FileDownload as FileDownloadIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { format as formatDate } from 'date-fns';

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days';

interface FlatAttendanceRecord {
    userId: number;
    userName: string;
    userEmail: string;
    date: string;
    punchInTime: string | null;
    lastSeen: string | null;
    workingTimeInSeconds: number;
    breakTimeInSeconds: number;
    idleTimeInSeconds: number;
    rejectedIdleTimeInSeconds: number;
    status: 'Absent' | 'Half Day' | 'Present' | 'Weekend';
}

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
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
    const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');
    const exportMenuOpen = Boolean(exportAnchorEl);


    const handleDatePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        const now = new Date();

        switch (preset) {
            case 'today':
                setSelectedRange([now, now]);
                break;
            case 'yesterday':
                const yesterday = subDays(now, 1);
                setSelectedRange([yesterday, yesterday]);
                break;
            case 'last7days':
                setSelectedRange([subDays(now, 6), now]);
                break;
            case 'last30days':
                setSelectedRange([subDays(now, 29), now]);
                break;
        }
    };

    const handleCustomRangeChange = (range: [Date, Date]) => {
        setDatePreset(null);
        setSelectedRange(range);
    };

    const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
        setExportAnchorEl(event.currentTarget);
    };

    const handleExportClose = () => {
        setExportAnchorEl(null);
    };

    const handleExportOption = (exportFunction: () => void) => {
        exportFunction();
        handleExportClose();
    };

    const handleOpenCustomDate = () => {
        // Initialize with current selected range
        const [start, end] = selectedRange;
        setTempStartDate(formatDate(start, 'yyyy-MM-dd'));
        setTempEndDate(formatDate(end, 'yyyy-MM-dd'));
        setShowCustomDateDialog(true);
    };

    const handleCloseCustomDate = () => {
        setShowCustomDateDialog(false);
    };

    const handleApplyCustomDate = () => {
        if (tempStartDate && tempEndDate) {
            const startDate = new Date(tempStartDate);
            const endDate = new Date(tempEndDate);
            handleCustomRangeChange([startDate, endDate]);
        }
        setShowCustomDateDialog(false);
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h:${mins}m`;
    };

    // Flatten data structure - combine all users' data into single array
    const flattenedData: FlatAttendanceRecord[] = useMemo(() => {
        return allUserStats.flatMap(userStat =>
            userStat.stats.map((stat: any) => ({
                userId: userStat.user.id,
                userName: userStat.user.name,
                userEmail: userStat.user.email,
                date: stat.date,
                punchInTime: stat.punchInTime,
                lastSeen: stat.lastSeen,
                workingTimeInSeconds: stat.workingTimeInSeconds || 0,
                breakTimeInSeconds: stat.breakTimeInSeconds || 0,
                idleTimeInSeconds: stat.idleTimeInSeconds || 0,
                rejectedIdleTimeInSeconds: stat.rejectedIdleTimeInSeconds || 0,
                status: stat.status || 'Absent',
            }))
        );
    }, [allUserStats]);

    // Search and sort functionality
    const sortedAndFilteredData = useMemo(() => {
        if (!localSearchTerm) return flattenedData;

        const lowercaseSearch = localSearchTerm.toLowerCase();

        return [...flattenedData].sort((a, b) => {
            const aMatches = a.userName.toLowerCase().includes(lowercaseSearch) ||
                a.userEmail.toLowerCase().includes(lowercaseSearch);
            const bMatches = b.userName.toLowerCase().includes(lowercaseSearch) ||
                b.userEmail.toLowerCase().includes(lowercaseSearch);

            // Matched users first
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;

            // Then alphabetically by name
            const nameCompare = a.userName.localeCompare(b.userName);
            if (nameCompare !== 0) return nameCompare;

            // Then by date descending (latest first)
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [flattenedData, localSearchTerm]);

    const columns = [
        {
            label: 'Name',
            tooltip: 'Employee name',
            render: (s: FlatAttendanceRecord) => s.userName
        },
        {
            label: 'Date',
            tooltip: 'The date of the record',
            render: (s: FlatAttendanceRecord) => moment(s.date).format('DD-MM-YY')
        },
        {
            label: 'Punching Time',
            tooltip: 'Employee First Login time',
            render: (s: FlatAttendanceRecord) => s.punchInTime ? moment(s.punchInTime).utcOffset('+05:30').format('hh:mm A') : '-'
        },
        {
            label: 'Last Seen',
            tooltip: 'Last active timestamp',
            render: (s: FlatAttendanceRecord) => {
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
            render: (s: FlatAttendanceRecord) => formatDuration((s.workingTimeInSeconds || 0) - (s.rejectedIdleTimeInSeconds || 0))
        },
        {
            label: 'Break Hours',
            tooltip: 'Total break time taken',
            render: (s: FlatAttendanceRecord) => formatDuration(s.breakTimeInSeconds || 0)
        },
        {
            label: 'Idle Hours',
            tooltip: 'Total idle time detected',
            render: (s: FlatAttendanceRecord) => formatDuration(s.idleTimeInSeconds || 0)
        },
        {
            label: 'Productive Hours',
            tooltip: 'Working hours - Break Time',
            render: (s: FlatAttendanceRecord) => {
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
        const worksheet = workbook.addWorksheet('Attendance - All Users');

        // Define export columns (includes Name and Date as first columns)
        const exportColumns = [
            { header: 'Name', key: 'name' },
            { header: 'Date', key: 'date' },
            { header: 'Punch In', key: 'punchIn' },
            { header: 'Punch Out', key: 'punchOut' },
            { header: 'Working Hours', key: 'workingHours' },
            { header: 'Productive Hours', key: 'productiveHours' },
            { header: 'Idle Hours', key: 'idleHours' },
            { header: 'Break Hours', key: 'breakHours' },
            { header: 'Status', key: 'status' }
        ];

        // Set columns
        worksheet.columns = exportColumns;

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F4788' }
        };

        // Add data rows
        sortedAndFilteredData.forEach((s) => {
            const working = s.workingTimeInSeconds || 0;
            const totalBreak = s.breakTimeInSeconds || 0;
            const displayWorking = working - s.rejectedIdleTimeInSeconds;
            const productive = displayWorking - totalBreak > 0 ? displayWorking - totalBreak : 0;

            // Format date with day name: "DD-MMM-YYYY (Day)"
            const dateFormatted = moment(s.date).format('DD-MMM-YYYY (ddd)');

            const rowData = {
                name: s.userName,
                date: dateFormatted,
                punchIn: s.punchInTime ? moment(s.punchInTime).utcOffset('+05:30').format('hh:mm A') : '-',
                punchOut: s.lastSeen ? moment(s.lastSeen).utcOffset('+05:30').format('hh:mm A') : '-',
                workingHours: formatDuration(displayWorking),
                productiveHours: formatDuration(productive),
                idleHours: formatDuration(s.idleTimeInSeconds || 0),
                breakHours: formatDuration(s.breakTimeInSeconds || 0),
                status: s.status
            };

            const row = worksheet.addRow(rowData);

            // Calculate working hours in hours (not seconds)
            const workingHours = displayWorking / 3600;
            let fontColor;

            // Determine color based on working hours
            if (workingHours < 4) {
                fontColor = 'FFDC2626'; // Red for < 4 hours
            } else if (workingHours >= 4 && workingHours <= 8) {
                fontColor = 'FFCA8A04'; // Yellow for 4-8 hours
            } else {
                fontColor = 'FF16A34A'; // Green for > 8 hours
            }

            // Apply color only to Working Hours cell text (no background)
            const workingHoursCell = row.getCell('workingHours');
            workingHoursCell.font = {
                color: { argb: fontColor },
                bold: true
            };
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, 'Attendance_All_Users_Report.xlsx');
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableColumn = columns.map((col) => col.label);
        const tableRows = sortedAndFilteredData.map((s) => {
            return columns.map(col => col.render(s));
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
        });

        doc.save('Attendance_All_Users_Report.pdf');
    };

    const exportToCSV = () => {
        const headers = columns.map(col => col.label).join(',');
        const rows = sortedAndFilteredData.map(s => columns.map(col => col.render(s)).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'Attendance_All_Users_Report.csv');
    };

    return (
        <main
            className={`mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-y-auto w-full`}
            style={{ marginLeft: mlValue }}
        >
            {/* Header Section */}
            <Box sx={{ mb: 4, bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Title and Action Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: '#e3f2fd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CalendarIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                                Attendance Records
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                                Detailed attendance tracking and productivity analysis
                            </Typography>
                        </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                            variant={datePreset === 'today' ? 'contained' : 'outlined'}
                            onClick={() => handleDatePresetChange('today')}
                            sx={{
                                borderRadius: 10,
                                textTransform: 'none',
                                fontWeight: 500,
                                px: 3
                            }}
                        >
                            Today
                        </Button>
                        <Button
                            variant={datePreset === 'yesterday' ? 'contained' : 'outlined'}
                            onClick={() => handleDatePresetChange('yesterday')}
                            sx={{
                                borderRadius: 10,
                                textTransform: 'none',
                                fontWeight: 500,
                                px: 3
                            }}
                        >
                            Yesterday
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<CalendarIcon />}
                            onClick={handleOpenCustomDate}
                            sx={{
                                borderRadius: 10,
                                textTransform: 'none',
                                fontWeight: 500,
                                px: 3,
                                color: '#666',
                                borderColor: '#ddd',
                                '&:hover': {
                                    borderColor: '#999',
                                    bgcolor: '#fafafa'
                                }
                            }}
                        >
                            Custom Date
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportClick}
                            sx={{
                                borderRadius: 10,
                                textTransform: 'none',
                                fontWeight: 500,
                                px: 3,
                                color: '#666',
                                borderColor: '#ddd',
                                '&:hover': {
                                    borderColor: '#999',
                                    bgcolor: '#fafafa'
                                }
                            }}
                        >
                            Export
                        </Button>
                    </Box>
                </Box>

                {/* Search Bar */}
                <Box>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search by name or email..."
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: '#999' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                bgcolor: '#fafafa'
                            }
                        }}
                    />
                </Box>
            </Box>

            {/* Export Menu */}
            <Menu
                anchorEl={exportAnchorEl}
                open={exportMenuOpen}
                onClose={handleExportClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={() => handleExportOption(exportToExcel)}>Export to Excel</MenuItem>
                <MenuItem onClick={() => handleExportOption(exportToPDF)}>Export to PDF</MenuItem>
                <MenuItem onClick={() => handleExportOption(exportToCSV)}>Export to CSV</MenuItem>
            </Menu>

            {/* Custom Date Dialog */}
            <Dialog
                open={showCustomDateDialog}
                onClose={handleCloseCustomDate}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle sx={{ pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CalendarIcon sx={{ color: '#1976d2' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Select Custom Date Range
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                            fullWidth
                            label="Start Date"
                            type="date"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            label="End Date"
                            type="date"
                            value={tempEndDate}
                            onChange={(e) => setTempEndDate(e.target.value)}
                            inputProps={{
                                min: tempStartDate
                            }}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={handleCloseCustomDate}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            borderRadius: 2
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApplyCustomDate}
                        variant="contained"
                        disabled={!tempStartDate || !tempEndDate}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            borderRadius: 2,
                            px: 3
                        }}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced Data Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse">
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
                        {sortedAndFilteredData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                                    No attendance records found
                                </td>
                            </tr>
                        ) : (
                            sortedAndFilteredData.map((s, i) => (
                                <tr
                                    key={`${s.userId}-${s.date}-${i}`}
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
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </main>
    );
};

export default Attendance;
