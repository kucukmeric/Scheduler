function initCourseList(courses) {
    const courseSelectionDiv = document.getElementById('course-selection');
    if (!courseSelectionDiv) return;

    courses.forEach(course => {
        const item = document.createElement('div');
        item.className = 'course-item';
        item.dataset.courseCode = course.code;
        item.textContent = course.code;
        courseSelectionDiv.appendChild(item);
    });
}