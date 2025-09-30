export class SortPanel {
    constructor(sorterConfig, daysConfig, onUpdateCallback) {
        this.allSorters = sorterConfig;
        this.daysOfWeek = daysConfig;
        this.onUpdate = onUpdateCallback;
        
        this.activeRules = [];
        this.nextInstanceId = 0;

        this.container = document.getElementById('sort-list-container');
        this.addRuleBtn = document.getElementById('add-rule-btn');
        this.panel = document.getElementById('sort-panel');
    }

    init() {
        this._attachListeners();
    }

    getActiveRules() {
        return this.activeRules;
    }

    render() {
        this.container.innerHTML = '';
        this.activeRules.forEach(rule => {
            const ruleEl = this._createRuleItemElement(rule);
            this.container.appendChild(ruleEl);
        });
    }

    _createRuleItemElement(rule) {
        const ruleEl = document.createElement('div');
        ruleEl.className = 'list-item';
        ruleEl.draggable = true;
        ruleEl.dataset.instanceId = rule.instanceId;
        
        let pickerHtml = '';
        if (rule.id === 'avoid-day') {
            const currentDay = this.daysOfWeek[rule.dayIndex];
            pickerHtml = `
                <div class="picker-wrapper">
                    <div class="list-item-picker">
                        <span>${currentDay}</span>
                    </div>
                    <div class="dropdown-menu">
                        ${this.daysOfWeek.map((day, index) => `
                            <div class="dropdown-item ${rule.dayIndex === index ? 'selected' : ''}" data-day-index="${index}">${day}</div>
                        `).join('')}
                    </div>
                </div>`;
        }
        
        ruleEl.innerHTML = `
            <div class="list-item-action delete-rule-btn">
                <i class="fas fa-trash-alt"></i>
            </div>
            <div class="list-item-main">${rule.displayName}</div>
            ${pickerHtml}
        `;
        return ruleEl;
    }

    _showRulePickerPopover() {
        this._removeExistingPopover();
        const popover = document.createElement('div');
        popover.className = 'rule-picker-popover';

        const available = this.allSorters.filter(s => s.allowMultiple || !this.activeRules.some(ar => ar.id === s.id));
        
        if (available.length > 0) {
            available.forEach(sorter => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = sorter.displayName;
                item.onclick = () => {
                    this.activeRules.push({ ...sorter, instanceId: this.nextInstanceId++ });
                    this._removeExistingPopover();
                    this.render();
                    this.onUpdate();
                };
                popover.appendChild(item);
            });
        } else {
            popover.innerHTML = `<div class="dropdown-item disabled">No more rules to add</div>`;
        }
        
        this.panel.appendChild(popover);
        popover.classList.add('visible');

        document.addEventListener('click', (event) => {
            if (!popover.contains(event.target) && !this.addRuleBtn.contains(event.target)) {
                this._removeExistingPopover();
            }
        }, { once: true });
    }

    _removeExistingPopover() {
        const existing = document.querySelector('.rule-picker-popover');
        if (existing) existing.remove();
    }

    _getDragAfterElement(y) {
        const draggable = [...this.container.querySelectorAll('.list-item:not(.dragging)')];
        return draggable.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    _attachListeners() {
        this.addRuleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._showRulePickerPopover();
        });

        this.container.addEventListener('click', e => {
            const deleteBtn = e.target.closest('.delete-rule-btn');
            const dayDropdownItem = e.target.closest('.dropdown-item[data-day-index]');

            if (deleteBtn) {
                const instanceId = parseInt(deleteBtn.closest('.list-item').dataset.instanceId, 10);
                this.activeRules = this.activeRules.filter(r => r.instanceId !== instanceId);
                this.render();
                this.onUpdate();
            }

            if (dayDropdownItem) {
                const listItem = dayDropdownItem.closest('.list-item');
                const instanceId = parseInt(listItem.dataset.instanceId, 10);
                const newDayIndex = parseInt(dayDropdownItem.dataset.dayIndex, 10);
                const rule = this.activeRules.find(r => r.instanceId === instanceId);
                if (rule) {
                    rule.dayIndex = newDayIndex;
                    this.render();
                    this.onUpdate();
                }
            }
        });

        this.container.addEventListener('dragstart', e => {
            if (e.target.classList.contains('list-item')) {
                e.target.classList.add('dragging');
            }
        });

        this.container.addEventListener('dragend', e => {
            if (e.target.classList.contains('list-item')) {
                e.target.classList.remove('dragging');
                const newOrderedIds = [...this.container.querySelectorAll('.list-item')].map(el => parseInt(el.dataset.instanceId, 10));
                this.activeRules.sort((a, b) => newOrderedIds.indexOf(a.instanceId) - newOrderedIds.indexOf(b.instanceId));
                this.onUpdate();
            }
        });

        this.container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this._getDragAfterElement(e.clientY);
            const dragging = document.querySelector('.dragging');
if (dragging) {
                if (afterElement == null) {
                    this.container.appendChild(dragging);
                } else {
                    this.container.insertBefore(dragging, afterElement);
                }
            }
        });
    }
}