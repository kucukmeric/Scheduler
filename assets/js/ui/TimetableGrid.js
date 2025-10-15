export class TimetableGrid {
    constructor(config, allCourses, onSelectCallback, getExportDataCallback) {
        this.config = config;
        this.allCourses = allCourses;
        this.onSelect = onSelectCallback;
        this.getExportData = getExportDataCallback;
        
        this.contentArea = document.getElementById('content-area');
        this.gridContainer = document.getElementById('timetable-grid');
        this.feedbackContainer = document.getElementById('content-feedback');
        this.modalOverlay = document.getElementById('timetable-modal-overlay');

        this.schedules = [];
        this.courseColorMap = new Map();
        this.renderedCount = 0;
        this.batchSize = 20;
    }

    init() {
        this._attachListeners();
        this.contentArea.addEventListener('scroll', () => this._onScroll());
    }

    setSchedules(schedules, courseColorMap) {
        this.schedules = schedules;
        this.courseColorMap = courseColorMap;
        this.renderedCount = 0;
        this.gridContainer.innerHTML = '';
        this.clearHighlight();
        
        if (schedules.length === 0) {
            this.feedbackContainer.textContent = 'No possible timetables found with this combination.';
            this.feedbackContainer.style.display = 'block';
            this.gridContainer.style.display = 'none';
        } else {
            this.feedbackContainer.style.display = 'none';
            this.gridContainer.style.display = 'grid';
            this._renderMoreSchedules();
        }
    }

    _renderMoreSchedules() {
        if (this.renderedCount >= this.schedules.length) return;

        const fragment = document.createDocumentFragment();
        const start = this.renderedCount;
        const end = Math.min(start + this.batchSize, this.schedules.length);

        for (let i = start; i < end; i++) {
            const card = this._createCardElement(this.schedules[i], i, this.courseColorMap);
            fragment.appendChild(card);
        }

        this.gridContainer.appendChild(fragment);
        this.renderedCount = end;
    }

    _onScroll() {
        const { scrollTop, scrollHeight, clientHeight } = this.contentArea;
        if (scrollHeight - scrollTop <= clientHeight + 200) this._renderMoreSchedules();
    }
    
    setInitialFeedback(message) {
        this.feedbackContainer.textContent = message;
        this.feedbackContainer.style.display = 'block';
        this.gridContainer.style.display = 'none';
    }

    _createCardElement(schedule, index, courseColorMap) {
        const card = document.createElement('div');
        card.className = 'timetable-card';
        card.dataset.index = index;

        let tableContent = `<thead><tr><th></th>${this.config.days.map(d => `<th>${d.substring(0,3)}</th>`).join('')}</tr></thead><tbody>`;

        for (let h = 0; h < this.config.hours.length; h++) {
            tableContent += `<tr><th>${this.config.hours[h]}</th>`;
            for (let d = 0; d < this.config.days.length; d++) {
                const blockIndex = d * this.config.totalHoursPerDay + h;
                
                const maskIndex = Math.floor(blockIndex / this.config.maskChunkSize);
                const bitPosition = blockIndex % this.config.maskChunkSize;
                const isOccupied = (schedule.mask[maskIndex] & (1 << bitPosition)) !== 0;

                let cellClass = '';
                let cellStyle = '';
                if (isOccupied && h !== this.config.lunchBlockIndex) {
                    const section = schedule.selection.find(s => s.blocks.includes(blockIndex));
                    const courseCode = section.id.split('-')[0];
                    cellStyle = `background-color: ${courseColorMap.get(courseCode) || '#cccccc'};`;
                    if (section.labBlocks.includes(blockIndex)) {
                        cellClass = 'is-lab-small';
                    }
                } else if (h === this.config.lunchBlockIndex) {
                    cellClass = 'card-lunch-cell';
                }
                tableContent += `<td class="${cellClass}" style="${cellStyle}"></td>`;
            }
            tableContent += `</tr>`;
        }
        tableContent += '</tbody>';
        card.innerHTML = `<table>${tableContent}</table>`;
        return card;
    }
    
    highlightCard(index) {
        this.clearHighlight();
        const card = this.gridContainer.querySelector(`.timetable-card[data-index="${index}"]`);
        if (card) {
            card.classList.add('is-selected');
        }
    }

    clearHighlight() {
        const selectedCard = this.gridContainer.querySelector('.timetable-card.is-selected');
        if (selectedCard) {
            selectedCard.classList.remove('is-selected');
        }
    }

    _showDetailedViewModal(index) {
        this.highlightCard(index);
        const schedule = this.schedules[index];
        if (!schedule) return;

        let tableContent = `<thead><tr><th>Time</th>${this.config.days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
        
        for (let h = 0; h < this.config.hours.length; h++) {
            tableContent += `<tr><th>${this.config.hours[h]}</th>`;
            for (let d = 0; d < this.config.days.length; d++) {
                const blockIndex = d * this.config.totalHoursPerDay + h;
                
                let cellClass = '';
                let cellContent = '';
                let cellStyle = '';

                const maskIndex = Math.floor(blockIndex / this.config.maskChunkSize);
                const bitPosition = blockIndex % this.config.maskChunkSize;
                const isOccupied = (schedule.mask[maskIndex] & (1 << bitPosition)) !== 0;

                if (isOccupied && h !== this.config.lunchBlockIndex) {
                    const section = schedule.selection.find(s => s.blocks.includes(blockIndex));
                    const prevBlockIndex = d * this.config.totalHoursPerDay + (h - 1);
                    const courseCode = section.id.split('-')[0];
                    const color = this.courseColorMap.get(courseCode) || '#cccccc';
                    
                    if (h === 0 || !section.blocks.includes(prevBlockIndex)) {
                        cellClass = 'is-course-start';
                        const course = this.allCourses.find(c => c.code === courseCode);
                        const isLab = section.labBlocks.includes(blockIndex);
                        const sectionNum = section.id.split('-')[1];
                        const courseName = course ? course.name : '';
                        cellContent = `<div class="course-color-indicator" style="background-color: ${color};"></div><div class="card-cell-details"><strong>${courseName} ${isLab ? '(Lab)' : ''}</strong><div class="details-sub-line"><span>${section.instructor}</span><em style="color: ${color};">Sec ${sectionNum}</em></div></div>`;
                    } else {
                        cellClass = 'is-course-continuation';
                        cellStyle = `style="--course-color: ${color}"`;
                    }
                } else if (h === this.config.lunchBlockIndex) {
                    cellClass = 'card-lunch-cell';
                }
                tableContent += `<td class="${cellClass}" ${cellStyle}>${cellContent}</td>`;
            }
            tableContent += `</tr>`;
        }
        tableContent += '</tbody>';
        
        this.modalOverlay.innerHTML = `<div class="timetable-modal-content"><header class="timetable-modal-header"><h3>Schedule Details (Option ${index + 1})</h3><div class="modal-actions"><button id="modal-download-btn" class="modal-action-btn"><i class="fas fa-download"></i> Download</button><button id="modal-export-btn" class="modal-action-btn"><i class="fas fa-file-export"></i> Export</button></div><button class="close-timetable-modal-btn" aria-label="Close detail view"><i class="fas fa-times"></i></button></header><div class="timetable-modal-body" id="modal-timetable-body"><table>${tableContent}</table></div></div>`;

        this.modalOverlay.querySelector('.close-timetable-modal-btn').addEventListener('click', () => this._hideDetailedViewModal());
        this.modalOverlay.addEventListener('click', (e) => { if (e.target === this.modalOverlay) this._hideDetailedViewModal(); });
        this.modalOverlay.querySelector('#modal-download-btn').addEventListener('click', () => this._handleModalDownload(index));
        this.modalOverlay.querySelector('#modal-export-btn').addEventListener('click', () => this._handleModalExport());

        this.modalOverlay.classList.add('visible');
        this.onSelect(index);
    }
    
    _handleModalDownload(index) {
        const tableBody = this.modalOverlay.querySelector('#modal-timetable-body');
        if (!tableBody || !window.html2canvas) return;
        
        html2canvas(tableBody, { useCORS: true }).then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `schedule_option_${index + 1}.png`;
            a.click();
        });
    }

    _handleModalExport() {
        const exportData = this.getExportData();
        if (!exportData) return;

        const dataStr = JSON.stringify({ selectedCourses: exportData }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ischeduler_export.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    _hideDetailedViewModal() {
        this.modalOverlay.classList.remove('visible');
        this.modalOverlay.innerHTML = '';
    }

    _attachListeners() {
        this.gridContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.timetable-card');
            if (card) {
                const index = parseInt(card.dataset.index, 10);
                this._showDetailedViewModal(index);
            }
        });
    }
}