export const rangePresets: { label: string; range: [Date, Date] }[] = [
  { label: 'Today', range: [new Date(), new Date()] as [Date, Date] },
  {
    label: 'Yesterday',
    range: [
      new Date(new Date().setDate(new Date().getDate() - 1)),
      new Date(new Date().setDate(new Date().getDate() - 1)),
    ] as [Date, Date],
  },
  {
    label: 'This Week',
    range: [
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
      new Date(),
    ] as [Date, Date],
  },
  {
    label: 'Last Week',
    range: [
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay() - 7)),
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay() - 1)),
    ] as [Date, Date],
  },
  {
    label: 'This Month',
    range: [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()] as [Date, Date],
  },
  {
    label: 'Past Month',
    range: [
      new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    ] as [Date, Date],
  },
];