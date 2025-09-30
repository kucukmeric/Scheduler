export class Modal {
    constructor(departmentsData, onCourseAddCallback) {
        this.departments = departmentsData;
        this.onCourseAdd = onCourseAddCallback;
        this.modalOverlay = document.getElementById('add-course-modal');
        this.userAddedCourses = new Set();
    }

    init() {
        this.modalOverlay.innerHTML = this._createHTML();
        this.deptListContainer = document.querySelector('#modal-department-list .list-container');
        this.courseListContainer = document.querySelector('#modal-course-list .list-container');
        this.closeBtn = document.querySelector('.close-modal-btn');
        this._attachListeners();
    }

    show(currentUserCourses) {
        this.userAddedCourses = new Set(currentUserCourses.map(c => c.courseCode));
        this._populateDepartments();
        this.courseListContainer.innerHTML = '<div class="modal-list-item disabled">Select a department</div>';
        this.modalOverlay.classList.add('visible');
    }

    hide() {
        this.modalOverlay.classList.remove('visible');
    }

    _populateDepartments() {
        this.deptListContainer.innerHTML = '';
        this.departments.forEach(dept => {
            const item = document.createElement('div');
            item.className = 'modal-list-item';
            item.dataset.deptCode = dept.deptCode;
            item.textContent = `${dept.deptCode} - ${dept.deptName}`;
            this.deptListContainer.appendChild(item);
        });
    }

    _populateCourses(deptCode) {
        this.deptListContainer.querySelectorAll('.modal-list-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.deptCode === deptCode);
        });
        
        this.courseListContainer.innerHTML = '';
        const department = this.departments.find(d => d.deptCode === deptCode);
        if (!department) return;

        const availableCourses = department.courses.filter(c => !this.userAddedCourses.has(c.code));

        if (availableCourses.length === 0) {
            this.courseListContainer.innerHTML = '<div class="modal-list-item disabled">All courses in this department have been added.</div>';
            return;
        }

        availableCourses.forEach(course => {
            const item = document.createElement('div');
            item.className = 'modal-list-item';
            item.dataset.courseCode = course.code;
            item.textContent = `${course.code} - ${course.name}`;
            this.courseListContainer.appendChild(item);
        });
    }

    _attachListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.hide();
        });

        this.deptListContainer.addEventListener('click', e => {
            if (e.target.matches('.modal-list-item')) {
                this._populateCourses(e.target.dataset.deptCode);
            }
        });

        this.courseListContainer.addEventListener('click', e => {
            if (e.target.matches('.modal-list-item:not(.disabled)')) {
                this.onCourseAdd(e.target.dataset.courseCode);
                this.hide();
            }
        });
    }

    _createHTML() {
        return `
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <header class="modal-header">
                    <h3 id="modal-title">Add a Course</h3>
                    <button class="close-modal-btn" aria-label="Close modal"><i class="fas fa-times"></i></button>
                </header>
                <div class="modal-content">
                    <div class="modal-column" id="modal-department-list">
                        <h4>Department</h4>
                        <div class="list-container"></div>
                    </div>
                    <div class="modal-column" id="modal-course-list">
                        <h4>Course</h4>
                        <div class="list-container"></div>
                    </div>
                </div>
            </div>
        `;
    }
}