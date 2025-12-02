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
    DialogActions,
    Autocomplete,
    Chip
} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    FileDownload as FileDownloadIcon,
    FilterList as FilterListIcon
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
    selectedUsers?: number[];
    setSelectedUsers?: (users: number[]) => void;
    availableUsers?: { id: number; name: string; email: string }[];
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
    selectedUsers = [],
    setSelectedUsers,
    availableUsers = [],
}) => {
    const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
    const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
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

    // Memoize selected user objects to prevent Autocomplete input reset
    const selectedUserObjects = useMemo(() =>
        availableUsers.filter(user => selectedUsers.includes(user.id)),
        [availableUsers, selectedUsers]
    );

    // Helper: Check if user is currently active
    const isUserActive = (record: FlatAttendanceRecord): boolean => {
        if (!record.lastSeen || record.status === 'Weekend') return false;
        const lastSeenTime = moment(record.lastSeen).utcOffset('+05:30');
        const currentTime = moment().utcOffset('+05:30');
        const minutesDiff = currentTime.diff(lastSeenTime, 'minutes');
        return minutesDiff >= 0 && minutesDiff <= 5;
    };

    // Helper: Check if record is from today
    const isToday = (dateString: string): boolean => {
        return moment(dateString).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD');
    };

    // Helper: Get effective working time (working time - rejected idle)
    const getEffectiveWorkingTime = (record: FlatAttendanceRecord): number => {
        return (record.workingTimeInSeconds || 0) - (record.rejectedIdleTimeInSeconds || 0);
    };

    // Filter and sort functionality
    const sortedAndFilteredData = useMemo(() => {
        let filtered = flattenedData;

        // Filter by selected users
        if (selectedUsers && selectedUsers.length > 0) {
            filtered = filtered.filter(record =>
                selectedUsers.includes(record.userId)
            );
        }

        // Sort the filtered data with priority-based sorting
        return [...filtered].sort((a, b) => {
            // Priority 1: Show today's records first
            const aIsToday = isToday(a.date);
            const bIsToday = isToday(b.date);

            if (aIsToday && !bIsToday) return -1;  // a (today) comes first
            if (!aIsToday && bIsToday) return 1;   // b (today) comes first

            // Priority 2: For today's records, inactive users first
            if (aIsToday && bIsToday) {
                const aIsActive = isUserActive(a);
                const bIsActive = isUserActive(b);

                if (!aIsActive && bIsActive) return -1;  // Inactive (a) comes first
                if (aIsActive && !bIsActive) return 1;   // Inactive (b) comes first

                // Priority 3: For today's records with same activity status,
                // sort by working time (less working time first)
                if (aIsActive === bIsActive) {
                    const aWorkingTime = getEffectiveWorkingTime(a);
                    const bWorkingTime = getEffectiveWorkingTime(b);

                    if (aWorkingTime !== bWorkingTime) {
                        return aWorkingTime - bWorkingTime;  // Less working time first
                    }
                }
            }

            // Priority 4: Alphabetically by name
            const nameCompare = a.userName.localeCompare(b.userName);
            if (nameCompare !== 0) return nameCompare;

            // Priority 5: By date descending (latest first)
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [flattenedData, selectedUsers]);

    const columns = [
        {
            label: 'Name',
            tooltip: 'Employee name',
            render: (s: FlatAttendanceRecord) => s.userName
        },
        {
            label: 'Date',
            tooltip: 'The date of the record',
            render: (s: FlatAttendanceRecord) => moment(s.date).format('DD-MMM-YYYY')
        },
        {
            label: 'Current Status',
            tooltip: 'Current working status - "Working" if active today',
            includeInExport: false,  // Exclude from exports (time-sensitive data)
            render: (s: FlatAttendanceRecord) => {
                // Check if this record is from today
                const recordIsToday = moment(s.date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD');

                if (!recordIsToday) {
                    return '-';  // Not today, no current status
                }

                if (s.status === 'Weekend') {
                    return 'Weekend';
                }

                // Check if user is currently active
                if (!s.lastSeen) {
                    return 'Not Started';
                }

                const lastSeenTime = moment(s.lastSeen).utcOffset('+05:30');
                const currentTime = moment().utcOffset('+05:30');
                const minutesDiff = currentTime.diff(lastSeenTime, 'minutes');

                if (minutesDiff >= 0 && minutesDiff <= 5) {
                    return 'Working';  // Active now
                }

                return 'Inactive';  // Not active
            }
        },
        {
            label: 'Attendance Status',
            tooltip: 'Overall attendance status: Present (8+ hrs), Half Day (4-8 hrs), Absent (<4 hrs)',
            render: (s: FlatAttendanceRecord) => s.status
        },
        {
            label: 'Punching Time',
            tooltip: 'Employee First Login time',
            render: (s: FlatAttendanceRecord) => {
                if (s.status === 'Weekend') return 'Weekend';
                return s.punchInTime ? moment(s.punchInTime).utcOffset('+05:30').format('hh:mm A') : '-';
            }
        },
        {
            label: 'Last Seen',
            tooltip: 'Last active timestamp',
            render: (s: FlatAttendanceRecord) => {
                if (s.status === 'Weekend') return 'Weekend';
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
            label: 'Productive Hours',
            tooltip: 'Working hours - Idle Time',
            render: (s: FlatAttendanceRecord) => {
                if (s.status === 'Weekend') return 'Weekend';
                const working = s.workingTimeInSeconds || 0;
                const idle = s.idleTimeInSeconds || 0;
                const displayWorking = working - s.rejectedIdleTimeInSeconds;
                const productive = displayWorking - idle > 0 ? displayWorking - idle : 0;
                return formatDuration(productive);
            }
        },
        {
            label: 'Break Hours',
            tooltip: 'Total break time taken',
            render: (s: FlatAttendanceRecord) => {
                if (s.status === 'Weekend') return 'Weekend';
                return formatDuration(s.breakTimeInSeconds || 0);
            }
        },
        {
            label: 'Idle Hours',
            tooltip: 'Total idle time detected',
            render: (s: FlatAttendanceRecord) => {
                if (s.status === 'Weekend') return 'Weekend';
                return formatDuration(s.idleTimeInSeconds || 0);
            }
        },
        {
            label: 'Working Hours',
            tooltip: 'Total punch In/Out time - Rejected idle time',
            render: (s: FlatAttendanceRecord) => {
                if (s.status === 'Weekend') return 'Weekend';
                return formatDuration((s.workingTimeInSeconds || 0) - (s.rejectedIdleTimeInSeconds || 0));
            }
        }
    ];

    // Helper: Get columns for export (excludes columns with includeInExport: false)
    const getExportColumns = () => {
        return columns.filter(col => (col as any).includeInExport !== false);
    };

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance - All Users');

        // Define export columns (excludes Current Status - time-sensitive data)
        const exportColumns = [
            { header: 'Name', key: 'name' },
            { header: 'Date', key: 'date' },
            { header: 'Attendance Status', key: 'status' },
            { header: 'Punch In', key: 'punchIn' },
            { header: 'Punch Out', key: 'punchOut' },
            { header: 'Productive Hours', key: 'productiveHours' },
            { header: 'Break Hours', key: 'breakHours' },
            { header: 'Idle Hours', key: 'idleHours' },
            { header: 'Working Hours', key: 'workingHours' }
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
            const idle = s.idleTimeInSeconds || 0;
            const displayWorking = working - s.rejectedIdleTimeInSeconds;
            const productive = displayWorking - idle > 0 ? displayWorking - idle : 0;

            // Format date with day name: "DD-MMM-YYYY (Day)"
            const dateFormatted = moment(s.date).format('DD-MMM-YYYY (ddd)');

            // Detect if this is a weekend
            const isWeekend = s.status === 'Weekend';

            // Prepare row data - show "Weekend" for all fields if it's a weekend
            let rowData;

            if (isWeekend) {
                // For weekends: show "Weekend" in all columns except Name and Date
                rowData = {
                    name: s.userName,
                    date: dateFormatted,
                    status: 'Weekend',
                    punchIn: 'Weekend',
                    punchOut: 'Weekend',
                    workingHours: 'Weekend',
                    productiveHours: 'Weekend',
                    idleHours: 'Weekend',
                    breakHours: 'Weekend'
                };
            } else {
                // For weekdays: show normal data
                rowData = {
                    name: s.userName,
                    date: dateFormatted,
                    status: s.status,
                    punchIn: s.punchInTime ? moment(s.punchInTime).utcOffset('+05:30').format('hh:mm A') : '-',
                    punchOut: s.lastSeen ? moment(s.lastSeen).utcOffset('+05:30').format('hh:mm A') : '-',
                    workingHours: formatDuration(displayWorking),
                    productiveHours: formatDuration(productive),
                    idleHours: formatDuration(s.idleTimeInSeconds || 0),
                    breakHours: formatDuration(s.breakTimeInSeconds || 0)
                };
            }

            const row = worksheet.addRow(rowData);

            // Apply row styling
            if (isWeekend) {
                // ============================================
                // WEEKEND ROW STYLING
                // ============================================

                // Apply styling to entire row
                row.eachCell((cell) => {
                    // Background color for entire row (light blue)
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE0F2FE' } // Light blue background
                    };

                    // Text styling - centered, bold, italic
                    cell.font = {
                        color: { argb: 'FF1E40AF' }, // Blue text
                        bold: true,
                        italic: true,
                        size: 11
                    };

                    // Center align all cells
                    cell.alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };
                });

            } else {
                // ============================================
                // WEEKDAY ROW STYLING (Working Hours Color)
                // ============================================

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

                // Apply color to ALL cells in the row
                row.eachCell((cell) => {
                    cell.font = {
                        color: { argb: fontColor }
                    };
                });

                // Make Working Hours cell bold (in addition to the color)
                const workingHoursCell = row.getCell('workingHours');
                workingHoursCell.font = {
                    color: { argb: fontColor },
                    bold: true
                };
            }
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
        const exportColumns = getExportColumns();
        const tableColumn = exportColumns.map((col) => col.label);
        const tableRows = sortedAndFilteredData.map((s) => {
            return exportColumns.map(col => col.render(s));
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
        });

        doc.save('Attendance_All_Users_Report.pdf');
    };

    const exportToCSV = () => {
        const exportColumns = getExportColumns();
        const headers = exportColumns.map(col => col.label).join(',');
        const rows = sortedAndFilteredData.map(s => exportColumns.map(col => col.render(s)).join(',')).join('\n');
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

                {/* User Filter - Multi-select with Search */}
                {availableUsers.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Autocomplete
                            multiple
                            id="user-filter"
                            options={availableUsers}
                            getOptionLabel={(option) => option.name}
                            value={selectedUserObjects}
                            onChange={(event, newValue) => {
                                if (setSelectedUsers) {
                                    setSelectedUsers(newValue.map(user => user.id));
                                }
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            filterSelectedOptions={false}
                            disableCloseOnSelect
                            renderInput={(params) => {
                                const { InputProps, ...restParams } = params;
                                return (
                                    <TextField
                                        {...restParams}
                                        size="small"
                                        placeholder="Filter by users (type to search, select multiple)"
                                        InputProps={{
                                            ...InputProps,
                                            startAdornment: (
                                                <>
                                                    <InputAdornment position="start">
                                                        <FilterListIcon sx={{ color: '#999' }} />
                                                    </InputAdornment>
                                                    {InputProps.startAdornment}
                                                </>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                bgcolor: '#fafafa'
                                            }
                                        }}
                                    />
                                );
                            }}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return (
                                        <Chip
                                            key={option.id}
                                            label={option.name}
                                            {...tagProps}
                                            size="small"
                                            sx={{ borderRadius: 1 }}
                                        />
                                    );
                                })
                            }
                            sx={{ flex: 1 }}
                        />
                        {selectedUsers.length > 0 && (
                            <Button
                                variant="text"
                                onClick={() => {
                                    if (setSelectedUsers) setSelectedUsers([]);
                                }}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    color: '#666',
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                        bgcolor: '#f5f5f5'
                                    }
                                }}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </Box>
                )}
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
                            sortedAndFilteredData.map((s, i) => {
                                const isWeekend = s.status === 'Weekend';
                                return (
                                    <tr
                                        key={`${s.userId}-${s.date}-${i}`}
                                        className={`border-b border-slate-100 transition-colors duration-200 ${
                                            isWeekend
                                                ? 'bg-blue-50 hover:bg-blue-100'
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        {columns.map(({ label, render }) => {
                                            const cellValue = render(s);
                                            return (
                                                <td
                                                    key={label}
                                                    className={`px-4 py-3 ${
                                                        isWeekend
                                                            ? 'text-blue-700 font-semibold italic text-center'
                                                            : label === 'Current Status'
                                                            ? cellValue === 'Working'
                                                                ? 'text-green-600 font-bold'
                                                                : cellValue === 'Inactive'
                                                                ? 'text-red-600 font-semibold'
                                                                : cellValue === 'Not Started'
                                                                ? 'text-yellow-600 font-medium'
                                                                : 'text-slate-500'
                                                            : label === 'Attendance Status'
                                                            ? cellValue === 'Present'
                                                                ? 'text-green-600 font-bold'
                                                                : cellValue === 'Half Day'
                                                                ? 'text-yellow-600 font-semibold'
                                                                : cellValue === 'Absent'
                                                                ? 'text-red-600 font-semibold'
                                                                : cellValue === 'Weekend'
                                                                ? 'text-blue-600 font-semibold'
                                                                : 'text-slate-500'
                                                            : cellValue === 'Active Now'
                                                            ? 'text-green-600 font-semibold'
                                                            : 'text-slate-700'
                                                    }`}
                                                >
                                                    {cellValue}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </main>
    );
};

// Wrap with React.memo to prevent re-renders from socket updates
export default React.memo(Attendance, (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    // Return false if props changed (re-render)
    return (
        prevProps.allUserStats === nextProps.allUserStats &&
        prevProps.selectedUsers === nextProps.selectedUsers &&
        prevProps.availableUsers === nextProps.availableUsers &&
        prevProps.selectedRange === nextProps.selectedRange &&
        prevProps.role === nextProps.role &&
        prevProps.currentStats === nextProps.currentStats &&
        prevProps.setSelectedUsers === nextProps.setSelectedUsers &&
        prevProps.setSelectedRange === nextProps.setSelectedRange
    );
});
