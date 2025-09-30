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

    render(schedules, courseColorMap) {
        this.gridContainer.innerHTML = '';
        this._clearSelection();
        
        if (schedules.length === 0) {
            this.feedbackContainer.textContent = 'No possible timetables found with this combination.';
            this.feedbackContainer.style.display = 'block';
            this.gridContainer.style.display = 'none';
        } else {
            this.feedbackContainer.style.display = 'none';
            this.gridContainer.style.display = 'grid';
            schedules.forEach((schedule, index) => {
                const card = this._createCardElement(schedule, index, courseColorMap);
                this.gridContainer.appendChild(card);
            });
        }
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
                const blockIndex = d * this.config.totalHoursPerDay + h;

                if (h === this.config.lunchBlockIndex) {
                    cellContent = `<div class="card-lunch-cell"></div>`;
                } else {
                    const maskIndex = Math.floor(blockIndex / this.config.maskChunkSize);
                    const bitPosition = blockIndex % this.config.maskChunkSize;
                    const isOccupied = (schedule.mask[maskIndex] & (1 << bitPosition)) !== 0;

                    if (isOccupied) {
                        const section = schedule.selection.find(s => s.blocks.includes(blockIndex));
                        const courseCode = section ? section.id.split('-')[0] : '';
                        const color = courseColorMap.get(courseCode) || '#cccccc';
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