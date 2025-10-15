import { config } from '../core/config.js';
import { generateSchedules } from '../core/scheduler.js';
import { CoursePanel } from './CoursePanel.js';
import { SortPanel } from './SortPanel.js';
import { Modal } from './Modal.js';
import { TimetableGrid } from './TimetableGrid.js';
import { DetailsPanel } from './DetailsPanel.js';
import { ActionHandler } from './ActionHandler.js';

export class UIManager {
    constructor(courseData) {
        this.allCourses = courseData.allCourses;
        this.departments = courseData.departments;
        this.schedules = [];
        this.currentIndex = -1;
        this.courseColorMap = new Map();
        
        this.feedbackSection = document.getElementById('feedback-section');
        this.globalFeedback = document.getElementById('global-feedback');
    }

    init() {
        this.modal = new Modal(this.departments, (courseCode) => this.coursePanel.addCourse(courseCode));
        this.coursePanel = new CoursePanel(this.allCourses, () => this._handleUpdate());
        this.sortPanel = new SortPanel(config.sorters, config.days, config.hours, () => this._handleUpdate());
        
        const getExportDataCallback = () => this.coursePanel.getUserCourses();
        this.timetableGrid = new TimetableGrid(
            config, 
            this.allCourses, 
            (index) => this._handleTimetableSelect(index),
            getExportDataCallback
        );

        this.detailsPanel = new DetailsPanel();
        this.actionHandler = new ActionHandler();
        
        this.modal.init();
        this.coursePanel.init((courses) => this.modal.show(courses));
        this.sortPanel.init();
        this.timetableGrid.init();

        this.actionHandler.init({
            onImport: (courses) => this._onImport(courses),
            getExportData: () => {
                return this.currentIndex !== -1 ? this.coursePanel.getUserCourses() : null;
            },
            getDownloadData: () => {
                if (this.currentIndex === -1) return null;
                return {
                    card: document.querySelector(`.timetable-card[data-index="${this.currentIndex}"]`),
                    index: this.currentIndex
                };
            }
        });

        this.timetableGrid.setInitialFeedback('Please add a course to begin.');
    }

    _updateGlobalFeedback(message) {
        if (message && message.trim().length > 0) {
            this.globalFeedback.textContent = message;
            this.feedbackSection.classList.add('visible');
        } else {
            this.globalFeedback.textContent = '';
            this.feedbackSection.classList.remove('visible');
        }
    }

    _handleUpdate() {
        this.currentIndex = -1;
        this._handleTimetableSelect(-1); 

        const userCourses = this.coursePanel.getUserCourses();

        this.courseColorMap.clear();
        const sortedCourses = [...userCourses].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        sortedCourses.forEach((course, index) => {
            const color = config.colors[index % config.colors.length];
            this.courseColorMap.set(course.courseCode, color);
        });
        this.coursePanel.setUserCourses(sortedCourses);
        this.coursePanel.render(this.courseColorMap);

        if (userCourses.length === 0) {
            this.schedules = [];
            this.timetableGrid.setInitialFeedback('Please add a course to begin.');
            return;
        }

        this.timetableGrid.setInitialFeedback('Generating possible schedules...');
        
        setTimeout(() => {
            const generationResult = generateSchedules(userCourses, this.allCourses);
            this.schedules = this._applySorters(generationResult.schedules);
            this.timetableGrid.setSchedules(this.schedules, this.courseColorMap);
            
            let feedbackMessage = `Generated ${this.schedules.length} possible schedules.`;
            if (generationResult.warnings.length > 0) feedbackMessage += ` ${generationResult.warnings.join(' ')}`;
            this._updateGlobalFeedback(feedbackMessage);
        }, 0);
    }

    _applySorters(schedules) {
        const activeSortRules = this.sortPanel.getActiveRules();
        
        schedules.forEach(schedule => {
            schedule.slotAvoidanceScore = 0;
            const rules = activeSortRules.filter(r => r.id === 'avoid-slot');
            rules.forEach(rule => {
                const blockIndex = rule.dayIndex * config.totalHoursPerDay + rule.hourIndex;
                const maskIndex = Math.floor(blockIndex / config.maskChunkSize);
                const bitPosition = blockIndex % config.maskChunkSize;
                if ((schedule.mask[maskIndex] & (1 << bitPosition)) !== 0) {
                    schedule.slotAvoidanceScore += 1;
                }
            });
        });

        return schedules.sort((a, b) => {
            for (const sorter of activeSortRules) {
                let scoreA, scoreB;
                if (sorter.id === 'avoid-day') {
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
        const downloadBtn = document.getElementById('download-btn');
        const exportBtn = document.getElementById('export-btn');

        if (index === -1) {
            this.detailsPanel.clear();
            downloadBtn.disabled = true;
            exportBtn.disabled = true;
            if(this.timetableGrid) this.timetableGrid.clearHighlight();
        } else {
            const selectedSchedule = this.schedules[index];
            if (selectedSchedule) {
                this.detailsPanel.render(selectedSchedule);
                downloadBtn.disabled = false;
                exportBtn.disabled = false;
            }
        }
    }
    
    _onImport(importedCourses) {
        const convertedCourses = importedCourses.map(item => {
            if (typeof item.selectedSectionId !== 'undefined') {
                return {
                    courseCode: item.courseCode,
                    filterType: item.selectedSectionId === 'any' ? 'any' : 'section',
                    filterValue: item.selectedSectionId === 'any' ? null : item.selectedSectionId
                };
            }
            return item;
        });

        const isValidContent = convertedCourses.every(item =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.courseCode === 'string' &&
            typeof item.filterType === 'string' &&
            (item.filterValue === null || typeof item.filterValue === 'string')
        );

        if (!isValidContent) {
            throw new Error("Invalid file format: Course data is malformed.");
        }

        this.coursePanel.setUserCourses(convertedCourses);
        this._handleUpdate();
    }
}