export const rangePresets = [
  { label: 'Today', range: [new Date(), new Date()] },
  {
    label: 'Yesterday',
    range: [
      new Date(new Date().setDate(new Date().getDate() - 1)),
      new Date(new Date().setDate(new Date().getDate() - 1)),
    ],
  },
  {
    label: 'This Week',
    range: [
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
      new Date(),
    ],
  },
  {
    label: 'Last Week',
    range: [
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay() - 7)),
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay() - 1)),
    ],
  },
  {
    label: 'This Month',
    range: [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()],
  },
  {
    label: 'Past Month',
    range: [
      new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    ],
  },
];