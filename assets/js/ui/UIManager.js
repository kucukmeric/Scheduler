import { config } from '../core/config.js';
import { generateSchedules } from '../core/scheduler.js';
import { CoursePanel } from './CoursePanel.js';
import { SortPanel } from './SortPanel.js';
import { Modal } from './Modal.js';
import { TimetableGrid } from './TimetableGrid.js';
import { DetailsPanel } from './DetailsPanel.js';

export class UIManager {
    constructor(courseData) {
        this.allCourses = courseData.allCourses;
        this.departments = courseData.departments;
        this.schedules = [];
        this.currentIndex = -1;
    }

    init() {
        this.modal = new Modal(this.departments, (courseCode) => this.coursePanel.addCourse(courseCode));
        this.coursePanel = new CoursePanel(this.allCourses, () => this._handleUpdate());
        this.sortPanel = new SortPanel(config.sorters, config.days, () => this._handleUpdate());
        this.timetableGrid = new TimetableGrid(config, (index) => this._handleTimetableSelect(index));
        this.detailsPanel = new DetailsPanel();
        
        this.modal.init();
        this.coursePanel.init((courses) => this.modal.show(courses));
        this.sortPanel.init();
        this.timetableGrid.init();

        this._attachGlobalListeners();
        this.timetableGrid.setInitialFeedback('Please add a course to begin.');
    }

    _handleUpdate() {
        const userCourses = this.coursePanel.getUserCourses();

        if (userCourses.length === 0) {
            this.schedules = [];
            this.timetableGrid.setInitialFeedback('Please add a course to begin.');
            this.detailsPanel.clear();
            this.detailsPanel.updateGlobalFeedback('');
            return;
        }

        const generated = generateSchedules(userCourses, this.allCourses);
        this.schedules = this._applySorters(generated);
        this.currentIndex = -1;
        
        this.timetableGrid.render(this.schedules);
        this.detailsPanel.clear();
        this.detailsPanel.updateGlobalFeedback(`Generated ${this.schedules.length} possible schedules.`);
    }

    _applySorters(schedules) {
        const activeSortRules = this.sortPanel.getActiveRules();
        return schedules.sort((a, b) => {
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

    _handleTimetableSelect(index) {
        this.currentIndex = index;
        const selectedSchedule = this.schedules[index];
        if (selectedSchedule) {
            this.detailsPanel.render(selectedSchedule);
        }
    }

    _handleExport() {
        if (this.currentIndex === -1) return;
        const highlighted = this.schedules[this.currentIndex];
        const exportData = {
            selectedCourses: this.coursePanel.getUserCourses()
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ischeduler_export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    _handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.selectedCourses || !Array.isArray(data.selectedCourses)) {
                    throw new Error("Invalid file format.");
                }
                this.coursePanel.setUserCourses(data.selectedCourses);
                this._handleUpdate();
            } catch (error) {
                alert(`Error: Could not import file. ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    
    _handleDownload() {
        if (this.currentIndex === -1) return;
        const card = document.querySelector(`.timetable-card[data-index="${this.currentIndex}"]`);
        if (card && window.html2canvas) {
            html2canvas(card, { 
                useCORS: true, 
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-background').trim()
            }).then(canvas => {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = `schedule_option_${this.currentIndex + 1}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        }
    }

    _attachGlobalListeners() {
        const importBtn = document.getElementById('import-btn');
        const importInput = document.getElementById('import-input');
        const exportBtn = document.getElementById('export-btn');
        const downloadBtn = document.getElementById('download-btn');

        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => this._handleImport(e));
        exportBtn.addEventListener('click', () => this._handleExport());
        downloadBtn.addEventListener('click', () => this._handleDownload());
    }
}