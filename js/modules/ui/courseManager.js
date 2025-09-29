const CourseManager = (function() {
    let allCoursesFlat = [];
    let departmentsData = [];
    let onUpdateCallback = () => {};
    let userCourses = [];

    // DOM Elements
    const modalOverlay = document.getElementById('add-course-modal-overlay');
    const deptListContainer = document.querySelector('#department-list .list-container');
    const courseListContainer = document.querySelector('#course-list .list-container');
    const userCourseListDiv = document.getElementById('course-selection-list');

    function renderUserCourseList() {
        userCourseListDiv.innerHTML = '';
        userCourses.sort((a, b) => a.courseCode.localeCompare(b.courseCode));

        userCourses.forEach(userCourse => {
            const courseData = allCoursesFlat.find(c => c.code === userCourse.courseCode);
            if (!courseData) return;

            const sectionDisplay = userCourse.selectedSectionId === 'any' 
                ? '<i class="fas fa-arrow-right"></i>'
                : userCourse.selectedSectionId.split('-')[1];

            const item = document.createElement('div');
            item.className = 'list-item user-course-item';
            item.dataset.courseCode = userCourse.courseCode;
            
            // NEW: Added a wrapper div and changed text to "Any"
            item.innerHTML = `
                <div class="list-item-action remove-course-btn" data-course-code="${userCourse.courseCode}">
                    <i class="fas fa-times"></i>
                </div>
                <div class="list-item-main">${userCourse.courseCode}</div>
                <div class="picker-wrapper">
                    <div class="list-item-picker section-picker">
                        <span>${sectionDisplay}</span>
                    </div>
                    <div class="dropdown-menu">
                        <div class="dropdown-item ${userCourse.selectedSectionId === 'any' ? 'selected' : ''}" data-section-id="any">Any</div>
                        ${courseData.sections.map(s => `
                            <div class="dropdown-item ${userCourse.selectedSectionId === s.id ? 'selected' : ''}" data-section-id="${s.id}">Section ${s.id.split('-')[1]}</div>
                        `).join('')}
                    </div>
                </div>
            `;
            userCourseListDiv.appendChild(item);
        });
    }

    function showModal() {
        populateDepartments();
        courseListContainer.innerHTML = '<div class="modal-list-item disabled">Select a department</div>';
        modalOverlay.classList.add('visible');
    }

    function hideModal() {
        modalOverlay.classList.remove('visible');
    }

    function populateDepartments() {
        deptListContainer.innerHTML = '';
        departmentsData.forEach(dept => {
            const item = document.createElement('div');
            item.className = 'modal-list-item';
            item.dataset.deptCode = dept.deptCode;
            item.textContent = `${dept.deptCode} - ${dept.deptName}`;
            deptListContainer.appendChild(item);
        });
    }

    function populateCourses(deptCode) {
        deptListContainer.querySelectorAll('.modal-list-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.deptCode === deptCode);
        });
        
        courseListContainer.innerHTML = '';
        const department = departmentsData.find(d => d.deptCode === deptCode);
        if (!department) return;

        department.courses.forEach(course => {
            const isAdded = userCourses.some(uc => uc.courseCode === course.code);
            const item = document.createElement('div');
            item.className = `modal-list-item ${isAdded ? 'disabled' : ''}`;
            item.dataset.courseCode = course.code;
            item.textContent = `${course.code} - ${course.name}`;
            courseListContainer.appendChild(item);
        });
    }
    
    function attachEventListeners() {
        document.getElementById('add-course-btn').addEventListener('click', showModal);
        document.querySelector('.close-modal-btn').addEventListener('click', hideModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) hideModal();
        });

        deptListContainer.addEventListener('click', e => {
            if (e.target.matches('.modal-list-item')) {
                populateCourses(e.target.dataset.deptCode);
            }
        });

        courseListContainer.addEventListener('click', e => {
            if (e.target.matches('.modal-list-item:not(.disabled)')) {
                const courseCode = e.target.dataset.courseCode;
                userCourses.push({ courseCode: courseCode, selectedSectionId: 'any' });
                renderUserCourseList();
                onUpdateCallback();
                hideModal();
            }
        });

        userCourseListDiv.addEventListener('click', e => {
            const dropdownItem = e.target.closest('.dropdown-item');
            const removeButton = e.target.closest('.remove-course-btn');

            if (dropdownItem) {
                const userCourseItem = e.target.closest('.user-course-item');
                const courseCode = userCourseItem.dataset.courseCode;
                const sectionId = dropdownItem.dataset.sectionId;
                const userCourse = userCourses.find(uc => uc.courseCode === courseCode);
                if (userCourse) {
                    userCourse.selectedSectionId = sectionId;
                    renderUserCourseList();
                    onUpdateCallback();
                }
            } else if (removeButton) {
                const courseCodeToRemove = removeButton.dataset.courseCode;
                userCourses = userCourses.filter(c => c.courseCode !== courseCodeToRemove);
                renderUserCourseList();
                onUpdateCallback();
            }
        });
    }

    return {
        init: (callback, deptData, flatCourses) => {
            onUpdateCallback = callback;
            departmentsData = deptData;
            allCoursesFlat = flatCourses;
            attachEventListeners();
        },
        getUserCourses: () => userCourses,
        getAllCourses: () => allCoursesFlat,
    };
})();