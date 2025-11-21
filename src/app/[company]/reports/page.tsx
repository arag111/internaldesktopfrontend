'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isWeekend } from 'date-fns';
import { Download, Calendar, FileText, User as UserIcon, Clock, CheckCircle, XCircle, FileDown, Mail, X, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Users, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { baseUrl } from '@/app/utils/config';

interface UserReport {
  userId: number;
  userName: string;
  email: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lopDays: number;
  totalWorkingHours: number;
  expectedWorkingHours: number;
  avgProductivity: number;
  elapsedWeekdays: number; // ✅ FIX: Track elapsed weekdays for accurate attendance %
  dailyRecords: {
    date: string;
    present: boolean;
    isHalfDay: boolean;
    workingHours: number;
    punchInTime: string | null;
    lastSeen: string | null;
    productiveHours: number;
    idleHours: number;
    breakHours: number;
  }[];
}

export default function ReportsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Reset to page 1 when month changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);

    if (!token || (storedRole !== 'admin' && storedRole !== 'manager')) {
      router.push('/');
      return;
    }

    fetchReportData();
  }, [selectedMonth, currentPage, router]); // Add currentPage dependency

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      const response = await axios.get(
        `${baseUrl}/api/activity/all-users?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}&page=${currentPage}&limit=${itemsPerPage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Handle both old and new response formats (backward compatibility)
      let userData;
      let paginationData;

      if (response.data.data && response.data.pagination) {
        // New paginated format
        userData = response.data.data;
        paginationData = response.data.pagination;
      } else {
        // Old format (direct array) - for backward compatibility
        userData = Array.isArray(response.data) ? response.data : [];
        // Calculate pagination from full dataset
        const allUsers = userData.length;
        const startIdx = (currentPage - 1) * itemsPerPage;
        userData = userData.slice(startIdx, startIdx + itemsPerPage);
        paginationData = {
          total: allUsers,
          page: currentPage,
          limit: itemsPerPage,
          totalPages: Math.ceil(allUsers / itemsPerPage)
        };
      }

      // Update pagination metadata
      setTotalUsers(paginationData.total);
      setTotalPages(paginationData.totalPages);

      /**
       * Process raw activity data to calculate attendance reports
       *
       * ✅ FIXED Key Calculations:
       * - Working Days: Days with >= 7.5 hours of work (more realistic threshold)
       * - Half Days: Days with >= 4 hours but < 7.5 hours of work
       * - LOP Days: WEEKDAYS ONLY with < 4 hours (excludes weekends & future dates)
       * - Present Days: Working Days + Half Days
       * - Productivity: Uses backend's pre-calculated value (workingTime / totalTimeAtDesk)
       * - Expected Hours: Weekdays only (Mon-Fri) × 8 hours/day
       * - Only count dates up to today (no future LOP)
       */
      const reports: UserReport[] = userData.map((userStat: any) => {
        const allDaysInMonth = eachDayOfInterval({ start, end });
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        // ✅ FIX: Only process dates up to today
        const daysUpToToday = allDaysInMonth.filter(day => day <= today);

        // Count only weekdays (Monday-Friday) for expected working hours
        const weekdaysInMonth = allDaysInMonth.filter(day => !isWeekend(day)).length;
        const elapsedWeekdays = daysUpToToday.filter(day => !isWeekend(day)).length;
        const expectedWorkingHours = weekdaysInMonth * 8; // 8 hours per weekday expected

        // Initialize counters for attendance tracking
        let workingDays = 0;      // Days with >= 7.5 hours
        let presentDays = 0;      // Working days + half days
        let halfDays = 0;         // Days with >= 4 hours but < 7.5 hours
        let lopDays = 0;          // WEEKDAYS ONLY with < 4 hours (Loss of Pay)
        let totalWorkingSeconds = 0;
        let totalProductivity = 0;
        let productivityCount = 0;

        const dailyRecords = allDaysInMonth.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayData = userStat.stats.find((s: any) => s.date === dateStr);

          const workingSeconds = dayData?.workingTimeInSeconds || 0;
          const breakSeconds = dayData?.breakTimeInSeconds || 0;
          const idleSeconds = dayData?.idleTimeInSeconds || 0;
          const workingHours = workingSeconds / 3600;

          const isPresent = workingHours >= 4; // ✅ FIX: Minimum 4 hours to count as present
          const isWeekendDay = isWeekend(day);
          const isFutureDate = day > today;

          // ✅ FIX: Improved half day and working day thresholds
          const isHalfDay = workingHours >= 4 && workingHours < 7.5;
          const isWorkingDay = workingHours >= 7.5;

          // ✅ FIX: Count attendance ONLY for past dates, exclude weekends from LOP
          if (!isFutureDate && !isWeekendDay) {
            if (workingHours < 4) {
              lopDays++; // Less than 4 hours on a weekday = LOP
            } else if (isHalfDay) {
              halfDays++; // 4-7.5 hours = Half Day
              presentDays++; // Still counts as present
            } else {
              workingDays++; // >= 7.5 hours = Working Day
              presentDays++; // Also counts as present
            }
          } else if (!isFutureDate && isWeekendDay && workingHours >= 4) {
            // Weekend work counts toward present days but not regular working days
            if (isWorkingDay) {
              workingDays++;
              presentDays++;
            } else if (isHalfDay) {
              halfDays++;
              presentDays++;
            }
          }

          totalWorkingSeconds += workingSeconds;

          // ✅ FIX: Use backend's pre-calculated productivity (already validated and clamped 0-100)
          // Backend calculates: (workingSeconds / totalTimeAtDesk) * 100
          if (dayData && dayData.productivity !== undefined) {
            totalProductivity += dayData.productivity;
            productivityCount++;
          }

          const productiveSeconds = workingSeconds - breakSeconds - idleSeconds;

          return {
            date: dateStr,
            present: isPresent,
            isHalfDay,
            workingHours,
            punchInTime: dayData?.punchInTime || null,
            lastSeen: dayData?.lastSeen || null,
            productiveHours: productiveSeconds / 3600,
            idleHours: idleSeconds / 3600,
            breakHours: breakSeconds / 3600
          };
        });

        const absentDays = lopDays; // LOP days are absent days
        const avgProductivity = productivityCount > 0 ? totalProductivity / productivityCount : 0;

        // ✅ FIX: Data validation - clamp productivity to valid range (0-100)
        const safeProductivity = Math.max(0, Math.min(100, Math.round(avgProductivity)));

        // Log warning if data quality issues detected
        if (avgProductivity > 100 || avgProductivity < 0) {
          console.warn(
            `⚠️ Data Quality Issue - Invalid productivity for ${userStat.user.name}: ` +
            `${avgProductivity.toFixed(1)}% (clamped to ${safeProductivity}%)`
          );
        }

        return {
          userId: userStat.user.id,
          userName: userStat.user.name,
          email: userStat.user.email,
          workingDays,
          presentDays,
          absentDays,
          halfDays,
          lopDays,
          totalWorkingHours: totalWorkingSeconds / 3600,
          expectedWorkingHours,
          avgProductivity: safeProductivity, // Use validated value
          dailyRecords,
          elapsedWeekdays // ✅ FIX: Add elapsed weekdays for accurate attendance %
        };
      });

      setUserReports(reports);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Helper function to convert hours to "Xh Ym" format
  const formatHoursToHHMM = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const exportIndividualReport = async (report: UserReport) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Attendance');

    // Add title
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `${report.userName} - Daily Attendance Report - ${format(selectedMonth, 'MMMM yyyy')}`;
    worksheet.getCell('A1').font = { size: 14, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Total Working Hours:', formatHoursToHHMM(report.totalWorkingHours)]);
    worksheet.addRow(['Expected Working Hours:', formatHoursToHHMM(report.expectedWorkingHours)]);
    worksheet.addRow(['Working Days (>=8hrs):', report.workingDays]);
    worksheet.addRow(['Half Days (<8hrs):', report.halfDays]);
    worksheet.addRow(['LOP Days:', report.lopDays]);
    worksheet.addRow(['Total Present Days:', report.presentDays]);
    worksheet.addRow(['Average Productivity:', report.avgProductivity + '%']);

    // Add daily records
    worksheet.addRow([]);
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      'Date',
      'Punch In',
      'Punch Out',
      'Working Hours',
      'Productive Hours',
      'Idle Hours',
      'Break Hours',
      'Status'
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF075a96' }
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add daily data
    let currentRow = headerRow.number + 1;
    report.dailyRecords.forEach(day => {
      let status = 'Absent';
      if ((day.workingHours || 0) > 0) {
        status = day.isHalfDay ? 'Half Day' : 'Present';
      }

      const row = worksheet.addRow([
        format(new Date(day.date), 'dd-MMM-yyyy (EEE)'),
        day.punchInTime ? format(new Date(day.punchInTime), 'hh:mm a') : '-',
        day.lastSeen ? format(new Date(day.lastSeen), 'hh:mm a') : '-',
        formatHoursToHHMM(day.workingHours || 0),
        formatHoursToHHMM(day.productiveHours || 0),
        formatHoursToHHMM(day.idleHours || 0),
        formatHoursToHHMM(day.breakHours || 0),
        status
      ]);

      // Highlight half day rows in yellow
      if (day.isHalfDay) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' } // Yellow background
          };
        });
      }

      currentRow++;
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${report.userName}_Daily_Report_${format(selectedMonth, 'MMM_yyyy')}.xlsx`);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Add title
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = `Attendance Report - ${format(selectedMonth, 'MMMM yyyy')}`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      'Employee Name',
      'Email',
      'Working Days',
      'Half Days',
      'LOP Days',
      'Present Days',
      'Total Working Hours',
      'Expected Hours',
      'Avg Productivity (%)',
      'Attendance %'
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF075a96' }
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data
    userReports.forEach(report => {
      // ✅ FIX: Use elapsed weekdays for accurate attendance %
      const attendancePercent = report.elapsedWeekdays > 0
        ? ((report.presentDays / report.elapsedWeekdays) * 100).toFixed(1)
        : '0';

      worksheet.addRow([
        report.userName,
        report.email,
        report.workingDays,
        report.halfDays,
        report.lopDays,
        report.presentDays,
        report.totalWorkingHours.toFixed(1),
        report.expectedWorkingHours,
        report.avgProductivity,
        attendancePercent + '%'
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Attendance_Report_${format(selectedMonth, 'MMM_yyyy')}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');

    // Add title
    doc.setFontSize(18);
    doc.text(`Attendance Report - ${format(selectedMonth, 'MMMM yyyy')}`, 14, 20);

    const tableColumn = [
      'Employee',
      'Working Days',
      'Half Days',
      'LOP',
      'Present',
      'Hours',
      'Expected',
      'Productivity',
      'Attendance %'
    ];

    const tableRows = userReports.map(report => {
      // ✅ FIX: Use elapsed weekdays for accurate attendance %
      const attendancePercent = report.elapsedWeekdays > 0
        ? ((report.presentDays / report.elapsedWeekdays) * 100).toFixed(1)
        : '0';

      return [
        report.userName,
        report.workingDays,
        report.halfDays,
        report.lopDays,
        report.presentDays,
        report.totalWorkingHours.toFixed(1) + 'h',
        report.expectedWorkingHours + 'h',
        report.avgProductivity + '%',
        attendancePercent + '%'
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [7, 90, 150] }
    });

    doc.save(`Attendance_Report_${format(selectedMonth, 'MMM_yyyy')}.pdf`);
    setShowExportMenu(false);
  };

  const handleSendEmail = (report: UserReport) => {
    setSelectedReport(report);
    setRecipientEmail(report.email);
    setShowEmailModal(true);
  };

  const sendEmailWithReport = async () => {
    if (!selectedReport || !recipientEmail) return;

    setSendingEmail(true);
    try {
      // Generate the Excel file as a buffer
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Attendance');

      // Add title
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = `${selectedReport.userName} - Daily Attendance Report - ${format(selectedMonth, 'MMMM yyyy')}`;
      worksheet.getCell('A1').font = { size: 14, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      // Add summary
      worksheet.addRow([]);
      worksheet.addRow(['Summary']);
      worksheet.addRow(['Total Working Hours:', formatHoursToHHMM(selectedReport.totalWorkingHours)]);
      worksheet.addRow(['Expected Working Hours:', formatHoursToHHMM(selectedReport.expectedWorkingHours)]);
      worksheet.addRow(['Working Days (>=8hrs):', selectedReport.workingDays]);
      worksheet.addRow(['Half Days (<8hrs):', selectedReport.halfDays]);
      worksheet.addRow(['LOP Days:', selectedReport.lopDays]);
      worksheet.addRow(['Total Present Days:', selectedReport.presentDays]);
      worksheet.addRow(['Average Productivity:', selectedReport.avgProductivity + '%']);

      // Add daily records
      worksheet.addRow([]);
      worksheet.addRow([]);
      const headerRow = worksheet.addRow([
        'Date',
        'Punch In',
        'Punch Out',
        'Working Hours',
        'Productive Hours',
        'Idle Hours',
        'Break Hours',
        'Status'
      ]);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF075a96' }
      };
      headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Add daily data
      selectedReport.dailyRecords.forEach(day => {
        let status = 'Absent';
        if ((day.workingHours || 0) > 0) {
          status = day.isHalfDay ? 'Half Day' : 'Present';
        }

        const row = worksheet.addRow([
          format(new Date(day.date), 'dd-MMM-yyyy (EEE)'),
          day.punchInTime ? format(new Date(day.punchInTime), 'hh:mm a') : '-',
          day.lastSeen ? format(new Date(day.lastSeen), 'hh:mm a') : '-',
          formatHoursToHHMM(day.workingHours || 0),
          formatHoursToHHMM(day.productiveHours || 0),
          formatHoursToHHMM(day.idleHours || 0),
          formatHoursToHHMM(day.breakHours || 0),
          status
        ]);

        if (day.isHalfDay) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF00' }
            };
          });
        }
      });

      worksheet.columns.forEach(column => {
        column.width = 18;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      // Send to backend
      const token = localStorage.getItem('token');
      await axios.post(
        `${baseUrl}/api/reports/send-email`,
        {
          email: recipientEmail,
          userName: selectedReport.userName,
          month: format(selectedMonth, 'MMMM yyyy'),
          attachment: base64,
          filename: `${selectedReport.userName}_Daily_Report_${format(selectedMonth, 'MMM_yyyy')}.xlsx`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToastMessage({ message: `Report sent successfully to ${recipientEmail}`, type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
      setShowEmailModal(false);
      setSelectedReport(null);
      setRecipientEmail('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.msg || error.message || 'Failed to send email. Please try again.';
      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSendingEmail(false);
    }
  };

  const exportToCSV = () => {
    const headers = 'Employee Name,Email,Working Days,Half Days,LOP Days,Present Days,Total Hours,Expected Hours,Avg Productivity %,Attendance %';
    const rows = userReports.map(report => {
      // ✅ FIX: Use elapsed weekdays for accurate attendance %
      const attendancePercent = report.elapsedWeekdays > 0
        ? ((report.presentDays / report.elapsedWeekdays) * 100).toFixed(1)
        : '0';

      return [
        report.userName,
        report.email,
        report.workingDays,
        report.halfDays,
        report.lopDays,
        report.presentDays,
        report.totalWorkingHours.toFixed(1),
        report.expectedWorkingHours,
        report.avgProductivity,
        attendancePercent
      ].join(',');
    }).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Attendance_Report_${format(selectedMonth, 'MMM_yyyy')}.csv`);
    setShowExportMenu(false);
  };

  // Pagination calculations - Backend pagination (no need for slice)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + userReports.length, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen" style={{ marginLeft: '16rem' }}>
        <div className="max-w-7xl mx-auto">
          {/* Material Design Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-normal text-slate-900 mb-1">
                  Attendance Reports
                </h1>
                <p className="text-sm text-slate-600 font-normal">Monthly attendance summary for all team members</p>
              </div>
            </div>

            {/* Month Selector and Export Controls */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <span className="text-base font-medium text-slate-900 min-w-[140px] text-center px-4 py-2">
                  {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => handleMonthChange('next')}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedMonth >= new Date()}
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10 overflow-hidden">
                    <button
                      onClick={exportToExcel}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2 border-b border-slate-100 last:border-b-0"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      Export to Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2 border-b border-slate-100 last:border-b-0"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      Export to PDF
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      Export to CSV
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Cards - Material Design */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Employees</span>
              </div>
              <p className="text-3xl font-normal text-slate-900">{totalUsers || userReports.length}</p>
              {totalPages > 1 && (
                <p className="text-xs text-slate-500 mt-1">Viewing page {currentPage} of {totalPages}</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">Avg Attendance</span>
              </div>
              <p className="text-3xl font-normal text-slate-900">
                {userReports.length > 0
                  ? Math.round(
                      userReports.reduce((sum, r) => {
                        // ✅ FIX: Use elapsed weekdays (not total days or future dates)
                        return sum + (r.elapsedWeekdays > 0 ? (r.presentDays / r.elapsedWeekdays) * 100 : 0);
                      }, 0) / userReports.length
                    )
                  : 0}%
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Hours</span>
              </div>
              <p className="text-3xl font-normal text-slate-900">
                {Math.round(userReports.reduce((sum, r) => sum + r.totalWorkingHours, 0))}h
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">Avg Productivity</span>
              </div>
              <p className="text-3xl font-normal text-slate-900">
                {userReports.length > 0
                  ? Math.round(userReports.reduce((sum, r) => sum + r.avgProductivity, 0) / userReports.length)
                  : 0}%
              </p>
            </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 uppercase whitespace-nowrap">Employee</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 uppercase whitespace-nowrap">Email</th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Days with ≥7.5 hours of work"
                    >
                      Working
                    </th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Days with 4-7.5 hours of work"
                    >
                      Half
                    </th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Loss of Pay: Weekdays with <4 hours (excludes weekends & future dates)"
                    >
                      LOP
                    </th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Total days present (Working Days + Half Days)"
                    >
                      Present
                    </th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Total hours worked in the month"
                    >
                      Hours
                    </th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Expected hours = Weekdays in month × 8 hours"
                    >
                      Expected
                    </th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Average productivity percentage from AI analysis"
                    >
                      Productivity
                    </th>
                    <th
                      className="px-2 py-3 text-center text-sm font-medium text-slate-700 uppercase cursor-help whitespace-nowrap"
                      title="Present days ÷ Elapsed weekdays × 100%"
                    >
                      Attendance
                    </th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-slate-700 uppercase whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-slate-500 font-medium text-sm">Loading report data...</p>
                        </div>
                      </td>
                    </tr>
                  ) : userReports.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <BarChart3 className="w-12 h-12 text-slate-300" />
                          <p className="text-slate-500 font-medium text-sm">No data available for this month</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    userReports.map((report) => {
                      // ✅ FIX: Use elapsed weekdays instead of total days for accurate attendance %
                      const attendancePercent = report.elapsedWeekdays > 0
                        ? ((report.presentDays / report.elapsedWeekdays) * 100).toFixed(1)
                        : '0';

                      return (
                        <tr key={report.userId} className="hover:bg-slate-50 transition-colors duration-200 border-b border-slate-100">
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-900 text-sm whitespace-nowrap">{report.userName}</div>
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-600 max-w-[200px]">
                            <div className="truncate" title={report.email}>{report.email}</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {report.workingDays}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                              {report.halfDays}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                              {report.lopDays}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                              {report.presentDays}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center text-sm font-medium text-slate-900 whitespace-nowrap">
                            {report.totalWorkingHours.toFixed(1)}h
                          </td>
                          <td className="px-2 py-2 text-center text-sm text-slate-600 whitespace-nowrap">
                            {report.expectedWorkingHours}h
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium border ${
                                report.avgProductivity >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                                report.avgProductivity >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {report.avgProductivity}%
                              </span>
                              {/* ✅ FIX: Show warning indicator for suspicious data */}
                              {(report.totalWorkingHours === 0 && report.avgProductivity > 0) && (
                                <span
                                  className="text-orange-600 cursor-help"
                                  title="Data quality issue: Productivity recorded with no working hours"
                                >
                                  ⚠️
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium border ${
                              parseFloat(attendancePercent) >= 90 ? 'bg-green-50 text-green-700 border-green-200' :
                              parseFloat(attendancePercent) >= 75 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {attendancePercent}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => exportIndividualReport(report)}
                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                                title="Export detailed daily report"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSendEmail(report)}
                                className="inline-flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                                title="Send report via email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && userReports.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {startIndex + userReports.length} of {totalUsers} employees
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;

                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Email Confirmation Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Send Report via Email</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                Send the attendance report for <strong className="text-slate-900">{selectedReport?.userName}</strong> ({format(selectedMonth, 'MMMM yyyy')}) to:
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-200 bg-white"
                  placeholder="Enter email address"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-slate-600">
                  <strong>Note:</strong> The report will include daily punch in/out times, working hours, and productivity metrics.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowEmailModal(false)}
                disabled={sendingEmail}
                className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={sendEmailWithReport}
                disabled={sendingEmail || !recipientEmail}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-200"
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Popup */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 toast-slide-in">
          <div className={`rounded-lg border shadow-lg px-4 py-3 min-w-[300px] flex items-center justify-between gap-4 ${
            toastMessage.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              toastMessage.type === 'success' 
                ? 'text-green-900' 
                : 'text-red-900'
            }`}>
              {toastMessage.message}
            </p>
            <button
              onClick={() => setToastMessage(null)}
              className={`hover:opacity-70 transition-colors flex-shrink-0 ${
                toastMessage.type === 'success' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
