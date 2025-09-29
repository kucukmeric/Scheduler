// --- CORE LOGIC ---
const HOURS_PER_DAY = 9;
const DAYS_PER_WEEK = 5;
const MASK_CHUNK_SIZE = 32; // Using 32-bit integers for masks

export class Section {
    constructor(id, instructor, blocks) {
        this.id = id;
        this.instructor = instructor;
        this.blocks = blocks;
        
        // Use an array of numbers for the mask, avoiding BigInt.
        // [0] for blocks 0-31, [1] for blocks 32-63
        this.mask = [0, 0]; 

        for (const b of blocks) {
            const maskIndex = Math.floor(b / MASK_CHUNK_SIZE); // Which integer to use
            const bitPosition = b % MASK_CHUNK_SIZE;         // Position within that integer
            this.mask[maskIndex] |= (1 << bitPosition);
        }
    }

    /**
     * Checks for conflicts with another mask array.
     * A conflict exists if any part of the masks overlap.
     */
    conflicts(otherMask) {
        return (this.mask[0] & otherMask[0]) !== 0 || 
               (this.mask[1] & otherMask[1]) !== 0;
    }
}

export function generateTimetables(userCourses, allCourses, index = 0, currentMask = [0, 0], selection = [], results = []) {
    if (index === userCourses.length) {
        if (selection.length > 0) {
            const tt = { selection: [...selection], mask: currentMask };
            calculateScores(tt);
            results.push(tt);
        }
        return;
    }

    const userCourse = userCourses[index];
    const courseData = allCourses.find(c => c.code === userCourse.courseCode);
    if (!courseData) {
        generateTimetables(userCourses, allCourses, index + 1, currentMask, [...selection], results);
        return;
    }

    if (userCourse.selectedSectionId !== 'any') {
        const lockedSection = courseData.sections.find(s => s.id === userCourse.selectedSectionId);
        if (lockedSection && !lockedSection.conflicts(currentMask)) {
            const newMask = [currentMask[0] | lockedSection.mask[0], currentMask[1] | lockedSection.mask[1]];
            generateTimetables(userCourses, allCourses, index + 1, newMask, [...selection, lockedSection], results);
        }
    } else {
        for (const s of courseData.sections) {
            if (s.conflicts(currentMask)) continue;
            const newMask = [currentMask[0] | s.mask[0], currentMask[1] | s.mask[1]];
            generateTimetables(userCourses, allCourses, index + 1, newMask, [...selection, s], results);
        }
    }
}

/**
 * Calculates scores for a given timetable based on various criteria.
 */
export function calculateScores(tt) {
    tt.gapScore = 0;
    tt.morningScore = 0;
    tt.dayScore = Array(DAYS_PER_WEEK).fill(0);
    tt.shortDayScore = 0;

    for (let d = 0; d < DAYS_PER_WEEK; d++) {
        let firstClass = -1;
        let lastClass = -1;
        let dailyBlockCount = 0;

        for (let h = 0; h < HOURS_PER_DAY; h++) {
            const blockIndex = d * HOURS_PER_DAY + h;
            const maskIndex = Math.floor(blockIndex / MASK_CHUNK_SIZE);
            const bitPosition = blockIndex % MASK_CHUNK_SIZE;
            const isOccupied = (tt.mask[maskIndex] & (1 << bitPosition)) !== 0;

            if (isOccupied) {
                if (firstClass === -1) firstClass = h;
                lastClass = h;
                dailyBlockCount++;
                
                if (h < 3) {
                    tt.morningScore += (3 - h);
                }
            }
        }
        
        tt.dayScore[d] = dailyBlockCount;

        if (dailyBlockCount > 0) {
            const dayDuration = lastClass - firstClass + 1;
            tt.gapScore += (dayDuration - dailyBlockCount);
            
            if (dailyBlockCount <= 2) {
                tt.shortDayScore += (3 - dailyBlockCount);
            }
        }
    }
}