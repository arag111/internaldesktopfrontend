// src/app/components/DateRangePicker.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';

type Props = {
  selectedRange: [Date, Date];
  onChange: (range: [Date, Date]) => void;
  presets?: { label: string; range: [Date, Date] }[];
};

export default function DateRangePicker({
  selectedRange,
  onChange,
  presets = [],
}: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {presets.map(({ label, range }) => (
        <button
          key={label}
          onClick={() => onChange(range)}
          className={`px-4 py-2 rounded-full border transition duration-200 ${
            selectedRange[0].toDateString() === range[0].toDateString() &&
            selectedRange[1].toDateString() === range[1].toDateString()
              ? 'bg-blue-600 text-white'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-blue-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
