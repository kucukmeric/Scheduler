function generateHourMarks(startHour, endHour) {
    const marks = [];
    for (let h = startHour; h <= endHour; h++) {
        const startTime = `${String(h).padStart(2, '0')}:30`;
        const endTime = `${String(h + 1).padStart(2, '0')}:20`;
        marks.push(`${startTime}-${endTime}`);
    }
    return marks;
}

export const config = {
    hours: generateHourMarks(8, 21),
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    colors: ['#c2410c', '#0f766e', '#9d174d', '#4d7c0f', '#1d4ed8', '#581c87', '#b45309', '#991b1b'],
    sorters: [
        { id: 'minimize-gaps', displayName: 'Minimize Gaps', scoreKey: 'gapScore', allowMultiple: false },
        { id: 'prefer-later', displayName: 'Prefer Later Classes', scoreKey: 'morningScore', allowMultiple: false },
        { id: 'avoid-short-days', displayName: 'Avoid Short Days', scoreKey: 'shortDayScore', allowMultiple: false },
        { id: 'cluster-labs', displayName: 'Cluster Labs', scoreKey: 'labSpreadScore', allowMultiple: false },
        { id: 'avoid-day', displayName: 'Avoid Day', scoreKey: 'dayScore', dayIndex: 0, allowMultiple: true },
        { id: 'avoid-slot', displayName: 'Avoid Time Slot', scoreKey: 'slotAvoidanceScore', dayIndex: 0, hourIndex: 0, allowMultiple: true }
    ],
    lunchBlockIndex: 4,
    maskChunkSize: 32,
};

config.totalHoursPerDay = config.hours.length;