'use client';

import { useState } from 'react';
import { DateRange, RangeKeyDict } from 'react-date-range';
import { addDays, format } from 'date-fns';
import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file

type Props = {
  selectedRange: [Date, Date];
  setSelectedRange: (range: [Date, Date]) => void;
  rangePresets: { label: string; range: [Date, Date] }[];
};

export default function DateRangePickerComponent({
  selectedRange,
  setSelectedRange,
  rangePresets,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelect = (ranges: RangeKeyDict) => {
    const { startDate, endDate } = ranges.selection;
    if (startDate && endDate && startDate <= endDate) {
      setSelectedRange([startDate, endDate]);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM dd yyyy');
  };

  return (
    <div className="relative z-50 not-prose"> {/* not-prose disables global prose styling */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="!bg-gray-100 !text-gray-700 !text-sm !px-3 !py-2 !rounded !shadow !border !border-gray-300 whitespace-nowrap"
        >
          {formatDate(selectedRange[0])} - {formatDate(selectedRange[1])}
        </button>

        {showPicker && (
          <div className="absolute mt-2 bg-white rounded shadow border">
            <DateRange
              editableDateInputs
              onChange={handleSelect}
              moveRangeOnFirstSelection={false}
              ranges={[
                {
                  startDate: selectedRange[0],
                  endDate: selectedRange[1],
                  key: 'selection',
                },
              ]}
              maxDate={new Date()}
            />

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2 p-2">
        {rangePresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              setSelectedRange(preset.range);
              setShowPicker(false);
            }}
            className="!bg-blue-100 !text-blue-800 !px-2 !py-1 !text-xs !rounded hover:!bg-blue-200"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Close Button */}
      <div className="flex justify-end p-2">
        <button
          onClick={() => setShowPicker(false)}
          className="!bg-gray-100 !text-sm !text-gray-600 hover:!bg-gray-300 !px-4 !py-2 !rounded-md !transition-colors"
        >
          Close
        </button>
          </div>
        </div>
      )}
    </div>
  );
}
