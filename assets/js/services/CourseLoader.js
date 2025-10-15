import { Section } from '../core/scheduler.js';

export async function load() {
    try {
        const response = await fetch('courses.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const departmentsData = await response.json();
        const allCourses = [];

        departmentsData.forEach(dept => {
            dept.courses.forEach(course => {
                const hydratedCourse = { 
                    ...course, 
                    sections: course.sections.map(s => new Section(`${course.code}-${s.num}`, s.instructor, s.lectures, s.labs)) 
                };
                allCourses.push(hydratedCourse);
            });
        });

        return { departments: departmentsData, allCourses: allCourses };
    } catch (error) {
        console.error("Failed to load or process course data:", error);
        throw error;
    }
}