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
import Navbar from '@/app/components/Navbar';
import CompanySidebar from '@/app/components/CompanySidebar';

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    setRole(storedRole);

    if (!token || (storedRole !== 'admin' && storedRole !== 'manager')) {
      router.push('/');
      return;
    }

    fetchReportData();
  }, [selectedMonth, router]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      const { data } = await axios.get(
        `${baseUrl}/api/activity/all-users?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Process data to calculate reports
      const reports: UserReport[] = data.map((userStat: any) => {
        const allDaysInMonth = eachDayOfInterval({ start, end });
        // Count only weekdays (Monday-Friday) for expected working hours
        const weekdaysInMonth = allDaysInMonth.filter(day => !isWeekend(day)).length;
        const expectedWorkingHours = weekdaysInMonth * 8; // 8 hours per weekday expected

        let workingDays = 0;
        let presentDays = 0;
        let halfDays = 0;
        let lopDays = 0;
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

          const isPresent = workingSeconds > 0;
          const isHalfDay = workingHours > 0 && workingHours < 8;

          // Count attendance
          if (workingSeconds === 0) {
            lopDays++; // No working hours = LOP
          } else if (isHalfDay) {
            halfDays++; // Less than 8 hours = Half Day
            presentDays++; // Still counts as present
          } else {
            workingDays++; // >= 8 hours = Working Day
            presentDays++; // Also counts as present
          }

          totalWorkingSeconds += workingSeconds;

          // Calculate productivity
          if (dayData && workingSeconds > 0) {
            const productive = workingSeconds - breakSeconds - idleSeconds;
            const productivity = (productive / workingSeconds) * 100;
            totalProductivity += productivity;
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
          avgProductivity: Math.round(avgProductivity),
          dailyRecords
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
      const totalDays = report.dailyRecords.length;
      const attendancePercent = totalDays > 0 ? ((report.presentDays / totalDays) * 100).toFixed(1) : '0';

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
      const totalDays = report.dailyRecords.length;
      const attendancePercent = totalDays > 0 ? ((report.presentDays / totalDays) * 100).toFixed(1) : '0';

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
      const totalDays = report.dailyRecords.length;
      const attendancePercent = totalDays > 0 ? ((report.presentDays / totalDays) * 100).toFixed(1) : '0';

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

  return (
    <>
      <Navbar />
      <CompanySidebar />

      <main className="ml-64 mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Hero Banner Section */}
          <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 mb-0.5">
                    Attendance Reports
                  </h1>
                  <p className="text-sm text-slate-500">Monthly attendance summary for all team members</p>
                </div>
              </div>
            </div>
            
            {/* Month Selector and Export Controls */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-4">
              {/* Month Selector */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="group px-4 py-2 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <ChevronLeft size={16} className="group-hover:text-blue-600" />
                  Previous
                </button>
                <span className="text-lg font-bold text-slate-800 min-w-[180px] text-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => handleMonthChange('next')}
                  className="group px-4 py-2 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedMonth >= new Date()}
                >
                  Next
                  <ChevronRight size={16} className="group-hover:text-blue-600" />
                </button>
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="group flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-white text-black rounded-lg text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors duration-200"
                >
                  <Download className="w-4 h-4 text-black" />
                  Export Report
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10 overflow-hidden">
                    <button
                      onClick={exportToExcel}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2 border-b border-slate-100 last:border-b-0"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      Export to Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2 border-b border-slate-100 last:border-b-0"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      Export to PDF
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      Export to CSV
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Employees</span>
                </div>
                <TrendingUp className="w-4 h-4 text-blue-500 opacity-60" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{userReports.length}</p>
            </div>

            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-green-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Attendance</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500 opacity-60" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {userReports.length > 0
                  ? Math.round(
                      userReports.reduce((sum, r) => {
                        const total = r.presentDays + r.absentDays;
                        return sum + (total > 0 ? (r.presentDays / total) * 100 : 0);
                      }, 0) / userReports.length
                    )
                  : 0}%
              </p>
            </div>

            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Hours</span>
                </div>
                <TrendingUp className="w-4 h-4 text-purple-500 opacity-60" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {Math.round(userReports.reduce((sum, r) => sum + r.totalWorkingHours, 0))}h
              </p>
            </div>

            <div className="group bg-white rounded-lg p-5 border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Productivity</span>
                </div>
                <TrendingUp className="w-4 h-4 text-orange-500 opacity-60" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Working Days</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Half Days</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">LOP</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Present</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Worked Hours</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Expected Hours</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Productivity</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Attendance %</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-slate-500 font-medium">Loading report data...</p>
                        </div>
                      </td>
                    </tr>
                  ) : userReports.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <BarChart3 className="w-12 h-12 text-slate-300" />
                          <p className="text-slate-500 font-medium">No data available for this month</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    userReports.map((report) => {
                      const totalDays = report.dailyRecords.length;
                      const attendancePercent = totalDays > 0 ? ((report.presentDays / totalDays) * 100).toFixed(1) : '0';

                      return (
                        <tr key={report.userId} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-slate-50 transition-all duration-200 border-b border-slate-100">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{report.userName}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{report.email}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200">
                              {report.workingDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border border-yellow-200">
                              {report.halfDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-red-100 to-red-50 text-red-700 border border-red-200">
                              {report.lopDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200">
                              {report.presentDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                            {report.totalWorkingHours.toFixed(1)}h
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-slate-600 font-medium">
                            {report.expectedWorkingHours}h
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${
                              report.avgProductivity >= 70 ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-200' :
                              report.avgProductivity >= 50 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200'
                            }`}>
                              {report.avgProductivity}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${
                              parseFloat(attendancePercent) >= 90 ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-200' :
                              parseFloat(attendancePercent) >= 75 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200'
                            }`}>
                              {attendancePercent}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => exportIndividualReport(report)}
                                className="group inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                                title="Export detailed daily report"
                              >
                                <FileDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                                Export
                              </button>
                              <button
                                onClick={() => handleSendEmail(report)}
                                className="group inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                                title="Send report via email"
                              >
                                <Mail className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                                Email
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
    </>
  );
}
