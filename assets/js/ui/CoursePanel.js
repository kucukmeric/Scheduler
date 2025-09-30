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
            this.userCourses.push({ 
                courseCode: courseCode, 
                filterType: 'any', 
                filterValue: null 
            });
            this.onUpdate();
        }
    }

    getUserCourses() {
        return this.userCourses;
    }

    setUserCourses(courses) {
        this.userCourses = courses;
    }
    
    render(courseColorMap) {
        this.container.innerHTML = '';
        const sortedCourses = [...this.userCourses].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        this.userCourses = sortedCourses;
        
        this.userCourses.forEach(userCourse => {
            const courseData = this.allCourses.find(c => c.code === userCourse.courseCode);
            if (!courseData) return;
            this.container.appendChild(this._createCourseItemElement(userCourse, courseData, courseColorMap));
        });
    }

    _getDisplayValue(userCourse) {
        switch (userCourse.filterType) {
            case 'section':
                return `Sec ${userCourse.filterValue.split('-')[1]}`;
            case 'teacher':
                return userCourse.filterValue;
            case 'any':
            default:
                return 'Any';
        }
    }

    _generateMainMenuHtml(userCourse) {
        return `
            <div class="dropdown-item ${userCourse.filterType === 'any' ? 'selected' : ''}" data-action="set-any">Any</div>
            <div class="dropdown-item" data-action="show-sections">By Section...</div>
            <div class="dropdown-item" data-action="show-teachers">By Teacher...</div>
        `;
    }

    _generateSectionsMenuHtml(courseData, userCourse) {
        const items = courseData.sections.map(s => {
            const isSelected = userCourse.filterType === 'section' && userCourse.filterValue === s.id;
            return `<div class="dropdown-item ${isSelected ? 'selected' : ''}" data-action="set-section" data-value="${s.id}">Section ${s.id.split('-')[1]}</div>`;
        }).join('');
        return `<div class="dropdown-item" data-action="show-main">&larr; Back</div>${items}`;
    }

    _generateTeachersMenuHtml(courseData, userCourse) {
        const teachers = [...new Set(courseData.sections.map(s => s.instructor))];
        const items = teachers.map(teacher => {
            const isSelected = userCourse.filterType === 'teacher' && userCourse.filterValue === teacher;
            return `<div class="dropdown-item ${isSelected ? 'selected' : ''}" data-action="set-teacher" data-value="${teacher}">${teacher}</div>`;
        }).join('');
        return `<div class="dropdown-item" data-action="show-main">&larr; Back</div>${items}`;
    }
    
    _createCourseItemElement(userCourse, courseData, courseColorMap) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.courseCode = userCourse.courseCode;
        const color = courseColorMap.get(userCourse.courseCode) || '#cccccc';

        item.innerHTML = `
            <div class="list-item-action remove-course-btn">
                <i class="fas fa-times"></i>
            </div>
            <div class="list-item-color-indicator" style="background-color: ${color};"></div>
            <div class="list-item-main">${userCourse.courseCode}</div>
            <div class="picker-wrapper">
                <div class="list-item-picker">
                    <span>${this._getDisplayValue(userCourse)}</span>
                </div>
                <div class="dropdown-menu">
                    ${this._generateMainMenuHtml(userCourse)}
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
            const target = e.target;
            const removeBtn = target.closest('.remove-course-btn');
            
            if (removeBtn) {
                const courseCode = removeBtn.closest('.list-item').dataset.courseCode;
                this.userCourses = this.userCourses.filter(c => c.courseCode !== courseCode);
                this.onUpdate();
                return;
            }
            
            if (target.matches('.dropdown-item')) {
                const listItem = target.closest('.list-item');
                const courseCode = listItem.dataset.courseCode;
                const courseToUpdate = this.userCourses.find(c => c.courseCode === courseCode);
                const courseData = this.allCourses.find(c => c.code === courseCode);
                const dropdownMenu = listItem.querySelector('.dropdown-menu');
                
                if (!courseToUpdate || !courseData) return;

                const action = target.dataset.action;
                const value = target.dataset.value;

                let stateChanged = false;

                switch (action) {
                    case 'show-main':
                        dropdownMenu.innerHTML = this._generateMainMenuHtml(courseToUpdate);
                        break;
                    case 'show-sections':
                        dropdownMenu.innerHTML = this._generateSectionsMenuHtml(courseData, courseToUpdate);
                        break;
                    case 'show-teachers':
                        dropdownMenu.innerHTML = this._generateTeachersMenuHtml(courseData, courseToUpdate);
                        break;
                    case 'set-any':
                        courseToUpdate.filterType = 'any';
                        courseToUpdate.filterValue = null;
                        stateChanged = true;
                        break;
                    case 'set-section':
                        courseToUpdate.filterType = 'section';
                        courseToUpdate.filterValue = value;
                        stateChanged = true;
                        break;
                    case 'set-teacher':
                        courseToUpdate.filterType = 'teacher';
                        courseToUpdate.filterValue = value;
                        stateChanged = true;
                        break;
                }

                if (stateChanged) {
                    this.onUpdate();
                }
            }
        });
    }
}