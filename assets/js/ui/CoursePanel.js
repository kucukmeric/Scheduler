export class CoursePanel {
    constructor(allCoursesData, onUpdateCallback) {
        this.allCourses = allCoursesData;
        this.onUpdate = onUpdateCallback;
        this.userCourses = [];
        this.container = document.getElementById('course-list-container');
        this.addCourseBtn = document.getElementById('add-course-btn');
    }

    init(showModalCallback) {
        this.showModal = showModalCallback;
        this._attachListeners();
    }
    
    addCourse(courseCode) {
        if (!this.userCourses.some(c => c.courseCode === courseCode)) {
            this.userCourses.push({ courseCode, selectedSectionId: 'any' });
            this.render();
            this.onUpdate();
        }
    }

    getUserCourses() {
        return this.userCourses;
    }

    setUserCourses(courses) {
        this.userCourses = courses;
        this.render();
    }
    
    render() {
        this.container.innerHTML = '';
        this.userCourses.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        this.userCourses.forEach(userCourse => {
            const courseData = this.allCourses.find(c => c.code === userCourse.courseCode);
            if (!courseData) return;
            this.container.appendChild(this._createCourseItemElement(userCourse, courseData));
        });
    }
    
    _createCourseItemElement(userCourse, courseData) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.courseCode = userCourse.courseCode;

        const sectionDisplay = userCourse.selectedSectionId === 'any' 
            ? 'Any'
            : `Sec ${userCourse.selectedSectionId.split('-')[1]}`;

        item.innerHTML = `
            <div class="list-item-action remove-course-btn">
                <i class="fas fa-times"></i>
            </div>
            <div class="list-item-main">${userCourse.courseCode}</div>
            <div class="picker-wrapper">
                <div class="list-item-picker">
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
        return item;
    }

    _attachListeners() {
        this.addCourseBtn.addEventListener('click', () => {
            this.showModal(this.userCourses);
        });
        
        this.container.addEventListener('click', e => {
            const removeBtn = e.target.closest('.remove-course-btn');
            const dropdownItem = e.target.closest('.dropdown-item');

            if (removeBtn) {
                const courseCode = removeBtn.closest('.list-item').dataset.courseCode;
                this.userCourses = this.userCourses.filter(c => c.courseCode !== courseCode);
                this.render();
                this.onUpdate();
            }

            if (dropdownItem) {
                const listItem = dropdownItem.closest('.list-item');
                const courseCode = listItem.dataset.courseCode;
                const sectionId = dropdownItem.dataset.sectionId;
                const courseToUpdate = this.userCourses.find(c => c.courseCode === courseCode);
                if (courseToUpdate) {
                    courseToUpdate.selectedSectionId = sectionId;
                    this.render();
                    this.onUpdate();
                }
            }
        });
    }
}