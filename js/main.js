import { config } from './modules/config.js';
import { Section, generateTimetables } from './modules/core.js';
import { renderTimetable } from './modules/ui/timetableRenderer.js';
import { CourseManager } from './modules/ui/courseManager.js';
import { SortableList } from './modules/ui/sortableList.js';

(async function() {
    // --- DOM ELEMENT REFERENCES ---
    const feedbackDiv = document.getElementById('feedback');
    const timetableContainer = document.getElementById('timetable-container');

    // --- DATA LOADING & PROCESSING ---
    async function loadAndProcessData() {
        try {
            const response = await fetch('courses.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const departmentsData = await response.json();

            // Create a flat list of all courses for easy lookups by the core generator
            const allCoursesFlat = [];

            // "Hydrate" the raw JSON data, creating Section instances
            departmentsData.forEach(dept => {
                dept.courses.forEach(course => {
                    const hydratedCourse = {
                        ...course,
                        sections: course.sections.map(s => new Section(`${course.code}-${s.num}`, s.instructor, s.blocks))
                    };
                    allCoursesFlat.push(hydratedCourse);
                });
            });

            return { departments: departmentsData, allCourses: allCoursesFlat };
        } catch (error) {
            console.error("Failed to load course data:", error);
            feedbackDiv.innerText = "Error: Could not load course data.";
            return { departments: [], allCourses: [] }; // Return empty objects on failure
        }
    }

    // --- MAIN APPLICATION FLOW ---
    function applySorters(results) {
        const activeSortRules = SortableList.getActiveRules();
        return results.sort((a, b) => {
            for (const sorter of activeSortRules) {
                let scoreA, scoreB;
                if (sorter.dayIndex !== undefined) {
                    scoreA = a.dayScore[sorter.dayIndex];
                    scoreB = b.dayScore[sorter.dayIndex];
                } else {
                    scoreA = a[sorter.scoreKey];
                    scoreB = b[sorter.scoreKey];
                }
                if (scoreA !== scoreB) return scoreA - scoreB;
            }
            return 0;
        });
    }

    function generateAndRender() {
        timetableContainer.innerHTML = '';
        const userCourses = CourseManager.getUserCourses();
        const allCourses = CourseManager.getAllCourses();

        if (userCourses.length === 0) {
            feedbackDiv.innerText = "Please add a course to begin.";
            return;
        }
        
        const results = [];
        try {
            generateTimetables(userCourses, allCourses, 0, [0, 0], [], results);
            const sorted = applySorters(results);
            
            if (sorted.length > 0) {
                feedbackDiv.innerText = `Generated ${sorted.length} possible timetables.`;
                sorted.forEach((r, i) => renderTimetable(r, i, config.days, config.hours, config.colors));
            } else {
                feedbackDiv.innerText = "No possible timetables found with this combination.";
            }
        } catch (e) { 
            feedbackDiv.innerText = `Error: ${e}`; 
            console.error(e); 
        }
    }

    // --- INITIALIZATION ---
    const { departments, allCourses } = await loadAndProcessData();
    if (allCourses.length > 0) {
        feedbackDiv.innerText = "Please add a course to begin.";
        CourseManager.init(generateAndRender, departments, allCourses);
        // CORRECTED: Removed the dash from "generateAnd-render"
        SortableList.init(generateAndRender, config.sorters, config.days);
    }
})();