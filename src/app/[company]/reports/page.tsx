'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isWeekend } from 'date-fns';
import { Download, Calendar, FileText, User as UserIcon, Clock, CheckCircle, XCircle, FileDown, Mail, X } from 'lucide-react';
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

      alert('Report sent successfully to ' + recipientEmail);
      setShowEmailModal(false);
      setSelectedReport(null);
      setRecipientEmail('');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
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

      <main className="ml-64 mt-16 p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Attendance Reports</h1>
            <p className="text-gray-600">Monthly attendance summary for all team members</p>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Month Selector */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Previous
                </button>
                <span className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
                  {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => handleMonthChange('next')}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                  disabled={selectedMonth >= new Date()}
                >
                  Next
                </button>
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#075a96] text-white rounded-md hover:bg-[#064a7d] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={exportToExcel}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      Export to Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      Export to PDF
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      Export to CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{userReports.length}</p>
                </div>
                <UserIcon className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">
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
                <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(userReports.reduce((sum, r) => sum + r.totalWorkingHours, 0))}h
                  </p>
                </div>
                <Clock className="w-10 h-10 text-purple-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Productivity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userReports.length > 0
                      ? Math.round(userReports.reduce((sum, r) => sum + r.avgProductivity, 0) / userReports.length)
                      : 0}%
                  </p>
                </div>
                <FileText className="w-10 h-10 text-orange-500 opacity-20" />
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#075a96] text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Employee</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Working Days</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Half Days</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">LOP</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Present</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Worked Hours</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Expected Hours</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Productivity</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Attendance %</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                        Loading report data...
                      </td>
                    </tr>
                  ) : userReports.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                        No data available for this month
                      </td>
                    </tr>
                  ) : (
                    userReports.map((report) => {
                      const totalDays = report.dailyRecords.length;
                      const attendancePercent = totalDays > 0 ? ((report.presentDays / totalDays) * 100).toFixed(1) : '0';

                      return (
                        <tr key={report.userId} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{report.userName}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{report.email}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {report.workingDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {report.halfDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {report.lopDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {report.presentDays}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                            {report.totalWorkingHours.toFixed(1)}h
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">
                            {report.expectedWorkingHours}h
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              report.avgProductivity >= 70 ? 'bg-green-100 text-green-800' :
                              report.avgProductivity >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {report.avgProductivity}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              parseFloat(attendancePercent) >= 90 ? 'bg-green-100 text-green-800' :
                              parseFloat(attendancePercent) >= 75 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {attendancePercent}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => exportIndividualReport(report)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#075a96] rounded hover:bg-[#064a7d] transition-colors"
                                title="Export detailed daily report"
                              >
                                <FileDown className="w-3 h-3" />
                                Export
                              </button>
                              <button
                                onClick={() => handleSendEmail(report)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                                title="Send report via email"
                              >
                                <Mail className="w-3 h-3" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Send Report via Email</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Send the attendance report for <strong>{selectedReport?.userName}</strong> ({format(selectedMonth, 'MMMM yyyy')}) to:
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#075a96] focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> The report will include daily punch in/out times, working hours, and productivity metrics.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowEmailModal(false)}
                disabled={sendingEmail}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={sendEmailWithReport}
                disabled={sendingEmail || !recipientEmail}
                className="px-4 py-2 text-sm font-medium text-white bg-[#075a96] rounded-md hover:bg-[#064a7d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    </>
  );
}
