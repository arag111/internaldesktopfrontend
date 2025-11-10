import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';
import axios from 'axios';
import { baseUrl } from '@/app/utils/config';

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

const formatDate = (date: Date, includeTime = true) => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  const year = date.getUTCFullYear();

  let time = '';
  if (includeTime) {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    time = ` ${hours}:${minutes}`;
  }

  return `${day} ${month} ${year}${time}`;
};

const ProcessingStatusBadge: React.FC<{
  textExtracted?: boolean;
  embeddingDone?: boolean;
  screenshotId?: string | number;
  onProcessingUpdate?: () => void;
}> = ({ textExtracted, embeddingDone, screenshotId, onProcessingUpdate }) => {
  const [processing, setProcessing] = useState(false);

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

      alert('Processing triggered! Check backend console for detailed logs.');
      if (onProcessingUpdate) onProcessingUpdate();
    } catch (error: any) {
      console.error('Processing error:', error);
      alert(`Error: ${error.response?.data?.msg || error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
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
  );
};

const groupByDateHour = (screenshots: Screenshot[]) => {
  const map: { [date: string]: { [hour: string]: Screenshot[] } } = {};

  screenshots.forEach(s => {
    const dateObj = new Date(s.timestamp);
    const dateKey = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
    const hourKey = dateObj.toISOString().slice(11, 13); // HH

    if (!map[dateKey]) map[dateKey] = {};
    if (!map[dateKey][hourKey]) map[dateKey][hourKey] = [];

    map[dateKey][hourKey].push(s);
  });

  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a)) // Desc by date
    .map(([dateKey, hours]) => ({
      date: new Date(dateKey),
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredScreenshots = useMemo(() => {
    if (!startDate && !endDate) return screenshots;

    return screenshots.filter((screenshot) => {
      const timestamp = new Date(screenshot.timestamp).getTime();
      const start = startDate ? new Date(startDate).getTime() : -Infinity;
      const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity;
      return timestamp >= start && timestamp <= end;
    });
  }, [screenshots, startDate, endDate]);

  const grouped = useMemo(() => {
    const sorted = [...filteredScreenshots].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const flat = [...sorted];
    setFlatScreenshots(flat);
    return groupByDateHour(sorted);
  }, [filteredScreenshots]);

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
      {/* Filter UI */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        <label className="text-sm text-slate-700 font-medium whitespace-nowrap">Search In Range</label>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Start Date:</label>
          <input
            type="date"
            className="flex-1 min-w-0 px-2.5 py-1.5 h-[38px] border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all duration-200 text-sm text-slate-900"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">End Date:</label>
          <input
            type="date"
            className="flex-1 min-w-0 px-2.5 py-1.5 h-[38px] border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all duration-200 text-sm text-slate-900"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Screenshot Grid */}
      {filteredScreenshots.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No screenshots available for the selected date range.</div>
      ) : (
        <div className="space-y-10 max-w-6xl mx-auto px-4">
          {grouped.map(({ date, hours }) => (
            <div key={date.toDateString()} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">{formatDate(date, false)}</h2>
              {hours.map(({ hour, screenshots }) => (
                <div key={hour} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-700">
                    {String(hour).padStart(2, '0')}:00 - {String(hour + 1).padStart(2, '0')}:00
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {screenshots.map((s, i) => {
                      const globalIndex = flatScreenshots.findIndex((fs) => fs._id === s._id);
                      return (
                        <div
                          key={s._id}
                          className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg border cursor-pointer transition-all"
                          onClick={() => openModal(globalIndex)}
                        >
                          <div className="relative aspect-w-4 aspect-h-3 bg-gray-100">
                            <img src={s.url} alt="Screenshot" className="w-full h-full object-cover" />
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
      {selectedImageIndex !== null && flatScreenshots[selectedImageIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur">
          <div className="relative max-w-5xl w-full mx-6 flex flex-col items-center justify-center">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-red-400 transition"
              onClick={() => setSelectedImageIndex(null)}
              style={{ zIndex: 10 }}
            >
              &times;
            </button>

            {/* Left Arrow */}
            {selectedImageIndex > 0 && (
              <button
                className="absolute left-4 text-white bg-black/60 p-3 rounded-full hover:bg-black"
                onClick={() => navigate('left')}
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Image */}
            <img
              src={flatScreenshots[selectedImageIndex].url}
              alt="Full Screenshot"
              className="w-full h-auto max-h-[80vh] rounded-lg shadow-lg"
            />

            {/* Screenshot Info */}
            <div className="mt-4 bg-white/90 backdrop-blur rounded-lg p-4 flex items-center gap-4">
              <div className="text-sm text-gray-800 font-medium">
                {formatDate(new Date(flatScreenshots[selectedImageIndex].timestamp))}
              </div>
              <ProcessingStatusBadge
                textExtracted={flatScreenshots[selectedImageIndex].textExtracted}
                embeddingDone={flatScreenshots[selectedImageIndex].embeddingDone}
                screenshotId={flatScreenshots[selectedImageIndex].id || flatScreenshots[selectedImageIndex]._id}
              />
            </div>

            {/* Right Arrow */}
            {selectedImageIndex < flatScreenshots.length - 1 && (
              <button
                className="absolute right-4 text-white bg-black/60 p-3 rounded-full hover:bg-black"
                onClick={() => navigate('right')}
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenshotGallery;
