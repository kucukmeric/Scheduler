// --- APPLICATION-WIDE CONFIGURATION ---
export const config = {
    hours: ['08:30-09:20', '09:30-10:20', '10:30-11:20', '11:30-12:20', '12:30-13:20', '13:30-14:20', '14:30-15:20', '15:30-16:20', '16:30-17:20'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    colors: ['#c2410c', '#0f766e', '#9d174d', '#4d7c0f', '#1d4ed8', '#581c87', '#b45309', '#991b1b'],
    sorters: [
        { id: 'minimize-gaps', displayName: 'Minimize Gaps', scoreKey: 'gapScore', allowMultiple: false },
        { id: 'prefer-later', displayName: 'Prefer Later Classes', scoreKey: 'morningScore', allowMultiple: false },
        { id: 'avoid-short-days', displayName: 'Avoid Short Days', scoreKey: 'shortDayScore', allowMultiple: false },
        { id: 'avoid-day', displayName: 'Avoid Day', scoreKey: 'dayScore', dayIndex: 0, allowMultiple: true }
    ]
};