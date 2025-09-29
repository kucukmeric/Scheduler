// --- CONFIGURATION & DATA ---

const hours = ['08:30-09:20', '09:30-10:20', '10:30-11:20', '11:30-12:20', '12:30-13:20', '13:30-14:20', '14:30-15:20', '15:30-16:20', '16:30-17:20'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const colors = ['#c2410c', '#0f766e', '#9d174d', '#4d7c0f', '#1d4ed8', '#581c87', '#b45309', '#991b1b'];

const courses = [
    { code: "CS201", sections: [ new Section("CS201-1", "A. Turing", [0, 8]), new Section("CS201-2", "G. Hopper", [4, 12]), new Section("CS201-3", "J. von Neumann", [2, 10]), ] },
    { code: "MATH225", sections: [ new Section("MATH225-1", "L. Euler", [1, 16]), new Section("MATH225-2", "C.F. Gauss", [6, 14]), new Section("MATH225-3", "E. Noether", [9, 17]), ] },
    { code: "PHYS102", sections: [ new Section("PHYS102-1", "I. Newton", [0, 3]), new Section("PHYS102-2", "A. Einstein", [4, 7]), new Section("PHYS102-3", "M. Curie", [8, 11]), ] },
    { code: "CHEM205", sections: [ new Section("CHEM205-1", "L. Pauling", [13, 19]), new Section("CHEM205-2", "D. Hodgkin", [1, 9]), new Section("CHEM205-3", "R. Franklin", [5, 13]), ] },
    { code: "HUM101", sections: [ new Section("HUM101-1", "Plato", [16, 18]), new Section("HUM101-2", "S. de Beauvoir", [14, 3]), new Section("HUM101-3", "F. Douglass", [8, 16]), ] },
    { code: "EE201", sections: [ new Section("EE201-1", "N. Tesla", [2, 14]), new Section("EE201-2", "T. Edison", [5, 16]), new Section("EE201-3", "M. Faraday", [11, 19]), ] },
    { code: "ME101", sections: [ new Section("ME101-1", "J. Watt", [4, 13]), new Section("ME101-2", "K. Benz", [10, 18]), new Section("ME101-3", "H. Ford", [0, 11]), ] },
    { code: "POLS201", sections: [ new Section("POLS201-1", "N. Machiavelli", [7, 12]), new Section("POLS201-2", "H. Arendt", [9, 18]), new Section("POLS201-3", "J. Locke", [1, 15]), ] },
    { code: "ART300", sections: [ new Section("ART300-1", "L. da Vinci", [6, 17]), new Section("ART300-2", "F. Kahlo", [2, 10]), new Section("ART300-3", "V. van Gogh", [12, 16]), ] },
    { code: "MBA500", sections: [ new Section("MBA500-1", "P. Drucker", [0, 13]), new Section("MBA500-2", "M. Porter", [4, 18]), new Section("MBA500-3", "C.K. Prahalad", [8, 14]), ] }
];

const sorters = [
    { id: 'minimize-gaps', displayName: 'Minimize Gaps', scoreKey: 'gapScore', allowMultiple: false },
    { id: 'prefer-later', displayName: 'Prefer Later Classes', scoreKey: 'morningScore', allowMultiple: false },
    { id: 'avoid-short-days', displayName: 'Avoid Short Days', scoreKey: 'shortDayScore', allowMultiple: false },
    { id: 'avoid-day', displayName: 'Avoid Day', scoreKey: 'dayScore', dayIndex: 0, allowMultiple: true }
];