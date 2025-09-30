import { config } from './config.js';
import { getLogicIndex } from './timeMapper.js';

const MASK_CHUNK_SIZE = 32;

export class Section {
    constructor(id, instructor, blocks) {
        this.id = id;
        this.instructor = instructor;
        this.blocks = blocks;
        
        const totalSchedulableBlocks = config.days.length * config.schedulableHoursPerDay;
        const numChunks = Math.ceil(totalSchedulableBlocks / MASK_CHUNK_SIZE);
        this.mask = new Array(numChunks).fill(0);

        for (const renderBlock of blocks) {
            const logicIndex = getLogicIndex(renderBlock);
            if (logicIndex === -1) continue;

            const maskIndex = Math.floor(logicIndex / MASK_CHUNK_SIZE);
            const bitPosition = logicIndex % MASK_CHUNK_SIZE;
            this.mask[maskIndex] |= (1 << bitPosition);
        }
    }

    conflicts(otherMask) {
        for (let i = 0; i < this.mask.length; i++) {
            if ((this.mask[i] & otherMask[i]) !== 0) {
                return true;
            }
        }
        return false;
    }
}

function generate(userCourses, allCourses, index, currentMask, selection, results) {
    if (index === userCourses.length) {
        if (selection.length > 0) {
            const schedule = { selection: [...selection], mask: currentMask };
            calculateScores(schedule);
            results.push(schedule);
        }
        return;
    }

    const userCourse = userCourses[index];
    const courseData = allCourses.find(c => c.code === userCourse.courseCode);
    if (!courseData) {
        generate(userCourses, allCourses, index + 1, currentMask, [...selection], results);
        return;
    }

    const sectionsToTry = userCourse.selectedSectionId === 'any'
        ? courseData.sections
        : courseData.sections.filter(s => s.id === userCourse.selectedSectionId);

    if (sectionsToTry.length === 0 && userCourse.selectedSectionId !== 'any') {
         // This handles the case where a locked section might not exist.
    } else if (sectionsToTry.length === 0) {
        // No sections available for this course, but it wasn't locked.
        generate(userCourses, allCourses, index + 1, currentMask, [...selection], results);
    }

    for (const s of sectionsToTry) {
        if (s.conflicts(currentMask)) continue;
        const newMask = currentMask.map((chunk, i) => chunk | s.mask[i]);
        generate(userCourses, allCourses, index + 1, newMask, [...selection, s], results);
    }
}

export function generateSchedules(userCourses, allCourses) {
    const results = [];
    const totalSchedulableBlocks = config.days.length * config.schedulableHoursPerDay;
    const numChunks = Math.ceil(totalSchedulableBlocks / MASK_CHUNK_SIZE);
    const initialMask = new Array(numChunks).fill(0);
    generate(userCourses, allCourses, 0, initialMask, [], results);
    return results;
}

export function calculateScores(schedule) {
    schedule.gapScore = 0;
    schedule.morningScore = 0;
    schedule.dayScore = Array(config.days.length).fill(0);
    schedule.shortDayScore = 0;

    for (let d = 0; d < config.days.length; d++) {
        let firstClass = -1;
        let lastClass = -1;
        let dailyBlockCount = 0;

        for (let h = 0; h < config.schedulableHoursPerDay; h++) {
            const logicIndex = d * config.schedulableHoursPerDay + h;
            const maskIndex = Math.floor(logicIndex / MASK_CHUNK_SIZE);
            const bitPosition = logicIndex % MASK_CHUNK_SIZE;
            const isOccupied = (schedule.mask[maskIndex] & (1 << bitPosition)) !== 0;

            if (isOccupied) {
                if (firstClass === -1) firstClass = h;
                lastClass = h;
                dailyBlockCount++;
                if (h < 3) schedule.morningScore += (3 - h);
            }
        }
        
        schedule.dayScore[d] = dailyBlockCount;

        if (dailyBlockCount > 0) {
            const dayDuration = lastClass - firstClass + 1;
            schedule.gapScore += (dayDuration - dailyBlockCount);
            if (dailyBlockCount <= 2) schedule.shortDayScore += (3 - dailyBlockCount);
        }
    }
}