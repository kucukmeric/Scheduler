export class TimetableGrid {
    constructor(config, allCourses, onSelectCallback) {
        this.config = config;
        this.allCourses = allCourses;
        this.onSelect = onSelectCallback;
        
        this.gridContainer = document.getElementById('timetable-grid');
        this.feedbackContainer = document.getElementById('content-feedback');

        this.activeCard = null;
        this.isDetailedView = false;
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
            <div class="card-back-btn"><i class="fas fa-times"></i></div>
            <table>
                <thead><tr><th></th>${this.config.days.map(d => `<th>${d.substring(0,3)}</th>`).join('')}</tr></thead>
                <tbody>
        `;

        for (let h = 0; h < this.config.hours.length; h++) {
            const hourMark = this.config.hours[h];
            tableHtml += `<tr><th>${hourMark}</th>`;
            for (let d = 0; d < this.config.days.length; d++) {
                let cellContent = '';
                const blockIndex = d * this.config.totalHoursPerDay + h;

                if (h === this.config.lunchBlockIndex) {
                    cellContent = `<div class="card-lunch-cell"></div>`;
                } else {
                    const maskIndex = Math.floor(blockIndex / this.config.maskSize);
                    const bitPosition = blockIndex % this.config.maskSize;
                    const isOccupied = (schedule.mask[maskIndex] & (1 << bitPosition)) !== 0;

                    if (isOccupied) {
                        const section = schedule.selection.find(s => s.blocks.includes(blockIndex));
                        const courseCode = section ? section.id.split('-')[0] : '';
                        const course = this.allCourses.find(c => c.code === courseCode);
                        
                        const color = courseColorMap.get(courseCode) || '#cccccc';
                        const sectionNum = section ? section.id.split('-')[1] : '';
                        const courseName = course ? course.name : '';
                        const instructor = section ? section.instructor : '';
                        
                        cellContent = `
                            <div class="card-occupied-cell" style="--course-color: ${color}"></div>
                            <div class="card-cell-details">
                                <strong>${courseName}</strong>
                                <span>${instructor}</span>
                                <em>Sec ${sectionNum}</em>
                            </div>
                        `;
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
        this.gridContainer.addEventListener('click', (e) => {
            if (this.isDetailedView) return;

            const card = e.target.closest('.timetable-card');
            if (card) {
                this._transitionToDetailedView(card);
            }
        });
    }

    _transitionToDetailedView(card) {
        if (this.activeCard) return;

        this.isDetailedView = true;
        this.activeCard = card;
        const index = parseInt(card.dataset.index, 10);
        
        const cardRect = card.getBoundingClientRect();
        card.style.top = `${cardRect.top}px`;
        card.style.left = `${cardRect.left}px`;
        card.style.width = `${cardRect.width}px`;
        card.style.height = `${cardRect.height}px`;
        
        requestAnimationFrame(() => {
            this.gridContainer.classList.add('detailed-view');
            card.classList.add('is-detailed', 'is-active');

            card.style.top = '';
            card.style.left = '';
            card.style.width = '';
            card.style.height = '';
        });

        const backBtn = card.querySelector('.card-back-btn');
        backBtn.addEventListener('click', this._transitionToCompactView.bind(this), { once: true });
        
        this.onSelect(index);
    }

    _transitionToCompactView(e) {
        if (!this.activeCard) return;
        e.stopPropagation();

        const cardRect = this.activeCard.getBoundingClientRect();
        const parentRect = this.gridContainer.getBoundingClientRect();
        const originalCard = this.gridContainer.querySelector(`.timetable-card[data-index="${this.activeCard.dataset.index}"]`);
        const originalRect = originalCard.getBoundingClientRect();

        this.activeCard.style.top = `${cardRect.top}px`;
        this.activeCard.style.left = `${cardRect.left}px`;
        this.activeCard.style.width = `${cardRect.width}px`;
        this.activeCard.style.height = `${cardRect.height}px`;

        this.activeCard.classList.remove('is-detailed');
        this.gridContainer.classList.remove('detailed-view');

        requestAnimationFrame(() => {
            this.activeCard.style.top = `${originalRect.top}px`;
            this.activeCard.style.left = `${originalRect.left}px`;
            this.activeCard.style.width = `${originalRect.width}px`;
            this.activeCard.style.height = `${originalRect.height}px`;
        });
        
        const onTransitionEnd = () => {
            this.isDetailedView = false;
            if (this.activeCard) {
                this.activeCard.style.top = '';
                this.activeCard.style.left = '';
                this.activeCard.style.width = '';
                this.activeCard.style.height = '';
                this.activeCard.classList.remove('is-active');
            }
            this.activeCard = null;
        };

        this.activeCard.addEventListener('transitionend', onTransitionEnd, { once: true });
        this.onSelect(-1);
    }

    _clearSelection() {
        if (this.activeCard) {
            this.activeCard.classList.remove('is-detailed', 'is-active');
            this.activeCard.style.cssText = '';
        }
        this.gridContainer.classList.remove('detailed-view');
        this.activeCard = null;
        this.isDetailedView = false;

        const previouslySelected = this.gridContainer.querySelector('.is-active');
        if (previouslySelected) {
            previouslySelected.classList.remove('is-active');
        }
    }
}