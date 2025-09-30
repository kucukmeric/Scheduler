import { getLogicIndex } from "../core/timeMapper.js";

export class TimetableGrid {
    constructor(config, onSelectCallback) {
        this.config = config;
        this.onSelect = onSelectCallback;
        
        this.gridContainer = document.getElementById('timetable-grid');
        this.feedbackContainer = document.getElementById('content-feedback');
    }

    init() {
        this._attachListeners();
    }

    render(schedules) {
        this.gridContainer.innerHTML = '';
        this._clearSelection();
        
        if (schedules.length === 0) {
            this.feedbackContainer.textContent = 'No possible timetables found with this combination.';
            this.feedbackContainer.style.display = 'block';
            this.gridContainer.style.display = 'none';
        } else {
            this.feedbackContainer.style.display = 'grid';
            schedules.forEach((schedule, index) => {
                const card = this._createCardElement(schedule, index);
                this.gridContainer.appendChild(card);
            });
        }
    }
    
    setInitialFeedback(message) {
        this.feedbackContainer.textContent = message;
        this.feedbackContainer.style.display = 'block';
        this.gridContainer.style.display = 'none';
    }

    _createCardElement(schedule, index) {
        const card = document.createElement('div');
        card.className = 'timetable-card';
        card.dataset.index = index;

        const courseToColor = new Map();
        schedule.selection.forEach((section, i) => {
            const courseCode = section.id.split('-')[0];
            if (!courseToColor.has(courseCode)) {
                courseToColor.set(courseCode, this.config.colors[i % this.config.colors.length]);
            }
        });

        let tableHtml = `
            <div class="card-header">Option ${index + 1}</div>
            <table>
                <thead><tr><th></th>${this.config.days.map(d => `<th>${d.substring(0,3)}</th>`).join('')}</tr></thead>
                <tbody>
        `;

        for (let h = 0; h < this.config.hours.length; h++) {
            const hourMark = this.config.hours[h].split('-')[0].substring(0, 5);
            tableHtml += `<tr><th>${hourMark}</th>`;
            for (let d = 0; d < this.config.days.length; d++) {
                let cellContent = '';
                if (h === this.config.lunchBlockIndex) {
                    cellContent = `<div class="card-lunch-cell"></div>`;
                } else {
                    const renderIndex = d * this.config.totalHoursPerDay + h;
                    const logicIndex = getLogicIndex(renderIndex);
                    
                    const MASK_CHUNK_SIZE = 32;
                    const maskIndex = Math.floor(logicIndex / MASK_CHUNK_SIZE);
                    const bitPosition = logicIndex % MASK_CHUNK_SIZE;
                    const isOccupied = (schedule.mask[maskIndex] & (1 << bitPosition)) !== 0;

                    if (isOccupied) {
                        const section = schedule.selection.find(s => s.blocks.includes(renderIndex));
                        const courseCode = section ? section.id.split('-')[0] : '';
                        const color = courseToColor.get(courseCode);
                        cellContent = `<div class="card-occupied-cell" style="--course-color: ${color}"></div>`;
                    }
                }
                tableHtml += `<td>${cellContent}</td>`;
            }
            tableHtml += `</tr>`;
        }
        tableHtml += '</tbody></table>';
        card.innerHTML = tableHtml;
        return card;
    }

    _attachListeners() {
        this.gridContainer.addEventListener('click', e => {
            const card = e.target.closest('.timetable-card');
            if (card) {
                const index = parseInt(card.dataset.index, 10);
                this._clearSelection();
                card.classList.add('is-active');
                this.onSelect(index);
            }
        });
    }

    _clearSelection() {
        const selectedCard = this.gridContainer.querySelector('.is-active');
        if (selectedCard) {
            selectedCard.classList.remove('is-active');
        }
    }
}