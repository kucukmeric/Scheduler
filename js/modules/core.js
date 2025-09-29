// --- CORE LOGIC ---

class Section {
    constructor(id, instructor, blocks) {
        this.id = id;
        this.instructor = instructor;
        this.blocks = blocks;
        this.mask = 0;
        for (let b of blocks) this.mask |= (1 << b);
    }
    conflicts(mask) { return (this.mask & mask) !== 0; }
}

function generateTimetables(userCourses, allCourses, index = 0, currentMask = 0, selection = [], results = []) {
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
    if (!courseData) { // Should not happen, but good for safety
        generateTimetables(userCourses, allCourses, index + 1, currentMask, [...selection], results);
        return;
    }

    // NEW LOGIC: Check for a locked section
    if (userCourse.selectedSectionId !== 'any') {
        const lockedSection = courseData.sections.find(s => s.id === userCourse.selectedSectionId);
        if (lockedSection && !lockedSection.conflicts(currentMask)) {
            generateTimetables(userCourses, allCourses, index + 1, currentMask | lockedSection.mask, [...selection, lockedSection], results);
        }
        // If locked section conflicts, this path stops, no other sections are tried.
    } else {
        // Original behavior: try all sections for this course
        for (let s of courseData.sections) {
            if (s.conflicts(currentMask)) continue;
            generateTimetables(userCourses, allCourses, index + 1, currentMask | s.mask, [...selection, s], results);
        }
    }
}

function calculateScores(tt) {
    tt.gapScore = 0; tt.morningScore = 0; tt.dayScore = [0, 0, 0, 0, 0]; tt.shortDayScore = 0;
    for(let d = 0; d < 5; d++){
        let dayMask = 0;
        let dailyBlockCount = 0;
        const seenBlocksThisDay = new Set();
        for(let h = 0; h < 4; h++){
            let bit = d * 4 + h;
            for(let s of tt.selection){
                if(s.blocks.includes(bit) && !seenBlocksThisDay.has(bit)){ 
                    dayMask |= (1 << h); 
                    dailyBlockCount++;
                    seenBlocksThisDay.add(bit);
                    tt.morningScore += (3 - h);
                }
            }
        }
        tt.dayScore[d] = dailyBlockCount;
        if (dailyBlockCount > 0) {
            tt.shortDayScore += (4 - dailyBlockCount);
        }
        let lastH = -1;
        for(let h = 0; h < 4; h++){
            if(dayMask & (1 << h)) { 
                if(lastH !== -1) tt.gapScore += (h - lastH - 1); 
                lastH = h; 
            }
        }
    }
}