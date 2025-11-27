import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Play, X } from 'lucide-react';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';
import { formatInUserTimezone, toUserTimezone } from '@/app/utils/timezone';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface Screenshot {
  _id: string;
  id?: number;
  url: string;
  timestamp: Date | string;
  textExtracted?: boolean;
  embeddingDone?: boolean;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
}

// ✅ FIX: Helper to get unique identifier from screenshot (handles both _id and id)
const getScreenshotId = (screenshot: Screenshot): string => {
  return screenshot._id || screenshot.id?.toString() || '';
};

const formatDate = (date: Date, includeTime = true) => {
  // ✅ FIX: Use timezone utility to display in user's local timezone
  if (includeTime) {
    return formatInUserTimezone(date, 'dd MMM yyyy HH:mm');
  }
  return formatInUserTimezone(date, 'dd MMM yyyy');
};

const ProcessingStatusBadge: React.FC<{
  textExtracted?: boolean;
  embeddingDone?: boolean;
  screenshotId?: string | number;
  onProcessingUpdate?: () => void;
}> = ({ textExtracted, embeddingDone, screenshotId, onProcessingUpdate }) => {
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleProcess = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal

    if (!screenshotId || processing) return;

    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      await axios.post(
        `${baseUrl}/api/screenshot-processing/process`,
        { screenshotId: screenshotId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToastMessage({ message: 'Processing triggered! Check backend console for detailed logs.', type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
      if (onProcessingUpdate) onProcessingUpdate();
    } catch (error: any) {
      const errorMessage = error.response?.data?.msg || error.message || 'Error processing screenshot';
      setToastMessage({ message: errorMessage, type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="flex gap-1 items-center">
        {/* OCR Status */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          textExtracted
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`} title={textExtracted ? 'Text Extracted' : 'No Text Extraction'}>
          {textExtracted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          <span>OCR</span>
        </div>

        {/* Embedding Status */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          embeddingDone
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-500'
        }`} title={embeddingDone ? 'Embedding Generated' : 'No Embedding'}>
          {embeddingDone ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          <span>EMB</span>
        </div>

        {/* Manual Trigger Button */}
        {screenshotId && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              processing
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : 'bg-purple-500 text-white hover:bg-purple-600 active:bg-purple-700'
            }`}
            title="Manually trigger OCR and Embedding processing"
          >
            <Play size={12} />
            <span>{processing ? 'Processing...' : 'Process'}</span>
          </button>
        )}
      </div>

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
};

const groupByDateHour = (screenshots: Screenshot[]) => {
  const map: { [date: string]: { [hour: string]: Screenshot[] } } = {};

  screenshots.forEach(s => {
    const dateObj = new Date(s.timestamp);
    // ✅ FIX: Convert to user's local timezone for grouping
    const localDate = toUserTimezone(dateObj);

    // Format date in user's timezone (YYYY-MM-DD)
    const dateKey = formatInUserTimezone(dateObj, 'yyyy-MM-dd');
    // Get hour in user's timezone
    const hourKey = String(localDate.getHours()).padStart(2, '0');

    if (!map[dateKey]) map[dateKey] = {};
    if (!map[dateKey][hourKey]) map[dateKey][hourKey] = [];

    map[dateKey][hourKey].push(s);
  });

  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a)) // Desc by date
    .map(([dateKey, hours]) => ({
      date: new Date(dateKey + 'T00:00:00'), // Parse as local date
      hours: Object.entries(hours)
        .sort(([a], [b]) => b.localeCompare(a)) // Desc by hour
        .map(([hourKey, shots]) => ({
          hour: parseInt(hourKey),
          screenshots: shots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        }))
    }));
};

const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [flatScreenshots, setFlatScreenshots] = useState<Screenshot[]>([]);

  const { grouped, flat, indexMap } = useMemo(() => {
    const sorted = [...screenshots].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const groupedData = groupByDateHour(sorted);

    // ✅ FIX: Rebuild flat array from grouped data to match display order
    // AND build indexMap for O(1) lookup
    const flatArray: Screenshot[] = [];
    const indexLookup = new Map<string, number>();

    let currentIndex = 0;
    groupedData.forEach(({ hours }) => {
      hours.forEach(({ screenshots }) => {
        screenshots.forEach(s => {
          const id = getScreenshotId(s);
          indexLookup.set(id, currentIndex);
          flatArray.push(s);
          currentIndex++;
        });
      });
    });

    return { grouped: groupedData, flat: flatArray, indexMap: indexLookup };
  }, [screenshots]);

  // Update state when flat array changes
  React.useEffect(() => {
    setFlatScreenshots(flat);
  }, [flat]);

  const openModal = (index: number) => setSelectedImageIndex(index);

  const navigate = (dir: 'left' | 'right') => {
    if (selectedImageIndex === null) return;
    const newIndex = dir === 'left' ? selectedImageIndex - 1 : selectedImageIndex + 1;
    if (newIndex >= 0 && newIndex < flatScreenshots.length) {
      setSelectedImageIndex(newIndex);
    }
  };

  return (
    <>
      {/* Screenshot Grid */}
      {screenshots.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No screenshots available.</div>
      ) : (
        <div className="space-y-10 max-w-6xl mx-auto px-4">
          {grouped.map(({ date, hours }) => (
            <div key={date.toDateString()} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{formatDate(date, false)}</h2>
              {hours.map(({ hour, screenshots }) => (
                <div key={`${date.toDateString()}-${hour}`} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-700">
                    {String(hour).padStart(2, '0')}:00 - {String(hour + 1).padStart(2, '0')}:00
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {screenshots.map((s, i) => {
                      // ✅ FIX: Use indexMap for O(1) lookup and proper ID handling
                      const globalIndex = indexMap.get(getScreenshotId(s)) ?? -1;
                      return (
                        <div
                          key={`${date.toDateString()}-${hour}-${s._id || s.id || i}`}
                          className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg border cursor-pointer transition-all"
                          onClick={() => openModal(globalIndex)}
                        >
                          <div className="relative aspect-w-4 aspect-h-3 bg-gray-100">
                            <LazyLoadImage
                              src={s.url}
                              alt="Screenshot"
                              className="w-full h-full object-cover"
                              effect="blur"
                              placeholderSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3C/svg%3E"
                            />
                            {/* Processing status overlay */}
                            <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-lg p-1">
                              <ProcessingStatusBadge
                                textExtracted={s.textExtracted}
                                embeddingDone={s.embeddingDone}
                                screenshotId={s.id || s._id}
                              />
                            </div>
                          </div>
                          <div className="p-3 border-t">
                            <div className="text-sm text-gray-600 font-medium mb-2">
                              {formatDate(new Date(s.timestamp))}
                            </div>
                            <div className="flex gap-1">
                              <ProcessingStatusBadge
                                textExtracted={s.textExtracted}
                                embeddingDone={s.embeddingDone}
                                screenshotId={s.id || s._id}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedImageIndex !== null && flat[selectedImageIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur">
          <div className="relative max-w-5xl w-full mx-6 flex flex-col items-center justify-center">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-lg border-2 border-white/30 hover:bg-red-600 transition-all shadow-lg"
              onClick={() => setSelectedImageIndex(null)}
              style={{ zIndex: 10 }}
            >
              <X size={24} />
            </button>

            {/* Left Arrow - Previous */}
            <button
              className={`absolute left-4 text-white p-3 rounded-full transition-all shadow-lg ${
                selectedImageIndex === 0
                  ? 'bg-black/30 cursor-not-allowed opacity-50'
                  : 'bg-black/60 hover:bg-black'
              }`}
              onClick={() => selectedImageIndex > 0 && navigate('left')}
              disabled={selectedImageIndex === 0}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Image */}
            <LazyLoadImage
              src={flat[selectedImageIndex].url}
              alt="Full Screenshot"
              className="w-full h-auto max-h-[80vh] rounded-lg shadow-lg"
              effect="blur"
            />

            {/* Screenshot Info */}
            <div className="mt-4 bg-white/90 backdrop-blur rounded-lg p-4 flex items-center gap-4">
              <div className="text-sm text-gray-800 font-medium">
                {formatDate(new Date(flat[selectedImageIndex].timestamp))}
              </div>
              <ProcessingStatusBadge
                textExtracted={flat[selectedImageIndex].textExtracted}
                embeddingDone={flat[selectedImageIndex].embeddingDone}
                screenshotId={flat[selectedImageIndex].id || flat[selectedImageIndex]._id}
              />
            </div>

            {/* Right Arrow - Next */}
            <button
              className={`absolute right-4 text-white p-3 rounded-full transition-all shadow-lg ${
                selectedImageIndex === flat.length - 1
                  ? 'bg-black/30 cursor-not-allowed opacity-50'
                  : 'bg-black/60 hover:bg-black'
              }`}
              onClick={() => selectedImageIndex < flat.length - 1 && navigate('right')}
              disabled={selectedImageIndex === flat.length - 1}
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenshotGallery;
