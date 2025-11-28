'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ScreenshotPreviewProps {
  screenshotId: number;
  screenshotUrl: string;
  timestamp: string;
  activity: string;
  isProductive: boolean;
  hasScreenshot?: boolean;
}

export default function ScreenshotPreview({
  screenshotId,
  screenshotUrl,
  timestamp,
  activity,
  isProductive,
  hasScreenshot = true
}: ScreenshotPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get authentication token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Create authenticated image URL
  const getAuthenticatedImageUrl = (url: string) => {
    const token = getAuthToken();
    if (!token) return url;

    // For API calls, we'll need to add the token in headers
    // Since we can't add headers to <img> src, we'll fetch and create blob URL
    return url;
  };

  const handleViewFullSize = () => {
    setIsModalOpen(true);
  };

  const handleReportIssue = () => {
    // TODO: Implement report issue functionality
    alert('Report issue functionality coming soon!');
  };

  if (!hasScreenshot || !screenshotUrl) {
    return (
      <div className="w-80 h-48 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-gray-300">
        <div className="text-center text-gray-500">
          <p className="text-4xl mb-2">📷</p>
          <p className="text-sm font-medium">Screenshot not available</p>
          <p className="text-xs mt-1 text-gray-400">Analysis based on cached data</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        {/* Thumbnail Preview */}
        <div className={`w-80 h-48 bg-gray-100 rounded-lg overflow-hidden border-2 ${
          isProductive ? 'border-green-300' : 'border-red-300'
        }`}>
          {!imageError ? (
            <img
              src={screenshotUrl}
              alt={`Screenshot at ${timestamp}`}
              className="object-cover w-full h-full cursor-pointer"
              onClick={handleViewFullSize}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-2xl mb-2">⚠️</p>
                <span className="text-sm">Image not available</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleViewFullSize}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <span>🔍</span>
            <span>View Full Size</span>
          </button>
          <button
            onClick={handleReportIssue}
            className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-1"
          >
            <span>🚨</span>
            <span>Report Issue</span>
          </button>
        </div>
      </div>

      {/* Full Size Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-6xl max-h-screen">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-10 right-0 bg-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 transition-colors font-bold text-lg"
              title="Close"
            >
              ×
            </button>

            {/* Full Size Image */}
            <div className="bg-white p-2 rounded-lg">
              <img
                src={screenshotUrl}
                alt={`Screenshot at ${timestamp}`}
                className="max-w-full max-h-[85vh] object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
              {/* Image Info */}
              <div className="mt-2 text-sm text-gray-600 text-center">
                <p><strong>Activity:</strong> {activity}</p>
                <p><strong>Time:</strong> {new Date(timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
