import { config } from './config.js';

export class Section {
    constructor(id, instructor, lectures, labs) {
        this.id = id;
        this.instructor = instructor;
        this.lectureBlocks = lectures || [];
        this.labBlocks = labs || [];
        this.blocks = [...this.lectureBlocks, ...this.labBlocks];
        
        const totalBlocks = config.days.length * config.totalHoursPerDay;
        const numChunks = Math.ceil(totalBlocks / config.maskChunkSize);
        this.mask = new Array(numChunks).fill(0);

        for (const blockIndex of this.blocks) {
            const maskIndex = Math.floor(blockIndex / config.maskChunkSize);
            const bitPosition = blockIndex % config.maskChunkSize;
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

function generate(userCourses, allCourses, index, currentMask, selection, results, warnings) {
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
        generate(userCourses, allCourses, index + 1, currentMask, [...selection], results, warnings);
        return;
    }

    let sectionsToTry = [];
    switch (userCourse.filterType) {
        case 'section':
            sectionsToTry = courseData.sections.filter(
                s => s.id === userCourse.filterValue
            );
            break;
        case 'teacher':
            sectionsToTry = courseData.sections.filter(
                s => s.instructor === userCourse.filterValue
            );
            break;
        default:
            sectionsToTry = courseData.sections;
            break;
    }
    
    if (sectionsToTry.length === 0 && userCourse.filterType !== 'any') {
        warnings.push(`No sections found for ${userCourse.courseCode} with the selected filter and has been ignored.`);
        generate(userCourses, allCourses, index + 1, currentMask, [...selection], results, warnings);
    } else if (sectionsToTry.length === 0) {
        generate(userCourses, allCourses, index + 1, currentMask, [...selection], results, warnings);
    }

    for (const s of sectionsToTry) {
        if (s.conflicts(currentMask)) continue;
        const newMask = currentMask.map((chunk, i) => chunk | s.mask[i]);
        generate(userCourses, allCourses, index + 1, newMask, [...selection, s], results, warnings);
    }
}

export function generateSchedules(userCourses, allCourses) {
    const results = [];
    const warnings = [];
    const totalBlocks = config.days.length * config.totalHoursPerDay;
    const numChunks = Math.ceil(totalBlocks / config.maskChunkSize);
    
    const lunchMask = new Array(numChunks).fill(0);
    for (let d = 0; d < config.days.length; d++) {
        const lunchBlockIndex = d * config.totalHoursPerDay + config.lunchBlockIndex;
        const maskIndex = Math.floor(lunchBlockIndex / config.maskChunkSize);
        const bitPosition = lunchBlockIndex % config.maskChunkSize;
        lunchMask[maskIndex] |= (1 << bitPosition);
    }
    
    generate(userCourses, allCourses, 0, lunchMask, [], results, warnings);
    return { schedules: results, warnings: warnings };
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

        for (let h = 0; h < config.totalHoursPerDay; h++) {
            const blockIndex = d * config.totalHoursPerDay + h;
            const maskIndex = Math.floor(blockIndex / config.maskChunkSize);
            const bitPosition = blockIndex % config.maskChunkSize;
            const isOccupied = (schedule.mask[maskIndex] & (1 << bitPosition)) !== 0;

            if (isOccupied && h !== config.lunchBlockIndex) {
                if (firstClass === -1) firstClass = h;
                lastClass = h;
                dailyBlockCount++;
                if (h < 3) schedule.morningScore += (3 - h);
            }
        }
        
        schedule.dayScore[d] = dailyBlockCount;

        if (dailyBlockCount > 0) {
            let dayDuration = lastClass - firstClass + 1;
            if (firstClass < config.lunchBlockIndex && lastClass > config.lunchBlockIndex) {
                dayDuration--;
            }
            schedule.gapScore += (dayDuration - dailyBlockCount);
            if (dailyBlockCount <= 2) schedule.shortDayScore += (3 - dailyBlockCount);
        }
    }
}