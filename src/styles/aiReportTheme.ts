/**
 * AI Report Design System
 * Color scheme and design tokens for TrackNexus AI Reports
 */

export const aiReportColors = {
  productive: {
    bg: '#10b981',      // green-500
    light: '#d1fae5',   // green-100
    border: '#059669',  // green-600
    text: '#065f46',    // green-800
  },
  unproductive: {
    bg: '#ef4444',      // red-500
    light: '#fee2e2',   // red-100
    border: '#dc2626',  // red-600
    text: '#991b1b',    // red-800
  },
  neutral: {
    bg: '#f59e0b',      // amber-500
    light: '#fef3c7',   // amber-100
    border: '#d97706',  // amber-600
    text: '#78350f',    // amber-900
  },
  metrics: {
    excellent: '#10b981',  // >= 85% - green
    good: '#3b82f6',       // >= 70% - blue
    average: '#f59e0b',    // >= 50% - amber
    poor: '#ef4444',       // < 50% - red
  },
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
  }
};

export const getMetricColor = (score: number): string => {
  if (score >= 85) return aiReportColors.metrics.excellent;
  if (score >= 70) return aiReportColors.metrics.good;
  if (score >= 50) return aiReportColors.metrics.average;
  return aiReportColors.metrics.poor;
};

export const getMetricLabel = (score: number): string => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  return 'Needs Improvement';
};

export const getProductivityColor = (isProductive: boolean): typeof aiReportColors.productive | typeof aiReportColors.unproductive => {
  return isProductive ? aiReportColors.productive : aiReportColors.unproductive;
};
