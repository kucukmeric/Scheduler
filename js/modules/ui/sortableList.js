const SortableList = (function() {
    let activeSortRules = [];
    let nextRuleInstanceId = 0;
    let onUpdateCallback = () => {};
    let allSorters = [];
    let daysOfWeek = [];

    const sortSelectionDiv = document.getElementById('sort-selection');

    function render() {
        sortSelectionDiv.innerHTML = '';
        activeSortRules.forEach(rule => {
            const ruleEl = document.createElement('div');
            ruleEl.className = 'list-item sort-item';
            ruleEl.draggable = true;
            ruleEl.dataset.instanceId = rule.instanceId;
            
            let pickerHtml = '';

            if (rule.id === 'avoid-day') {
                const currentDay = daysOfWeek[rule.dayIndex];
                pickerHtml = `
                    <div class="picker-wrapper">
                        <div class="list-item-picker">
                            <span>${currentDay}</span>
                        </div>
                        <div class="dropdown-menu">
                            ${daysOfWeek.map((day, index) => `
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
            sortSelectionDiv.appendChild(ruleEl);
        });
        const addRuleButton = document.createElement('button');
        addRuleButton.className = 'add-item-btn';
        addRuleButton.id = 'add-rule-btn';
        addRuleButton.innerHTML = `<i class="fas fa-plus"></i> Add Sorting Rule`;
        sortSelectionDiv.appendChild(addRuleButton);
    }

    function showRulePickerPopover(button) {
        const existingPopover = document.querySelector('.rule-picker-popover');
        if (existingPopover) existingPopover.remove();
        const popover = document.createElement('div');
        popover.className = 'rule-picker-popover';
        const availableSorters = allSorters.filter(s => s.allowMultiple || !activeSortRules.some(ar => ar.id === s.id));
        if (availableSorters.length > 0) {
            availableSorters.forEach(sorter => {
                const item = document.createElement('div');
                item.className = 'dropdown-item rule-picker-item';
                item.textContent = sorter.displayName;
                item.onclick = () => {
                    activeSortRules.push({ ...sorter, instanceId: nextRuleInstanceId++ });
                    popover.remove();
                    render();
                    onUpdateCallback();
                };
                popover.appendChild(item);
            });
        } else {
            popover.innerHTML = `<div class="dropdown-item disabled">No more rules to add</div>`;
        }
        const parentSection = button.closest('.sidebar-section');
        parentSection.appendChild(popover);
        const buttonRect = button.getBoundingClientRect();
        const parentRect = parentSection.getBoundingClientRect();
        popover.style.left = `${buttonRect.left - parentRect.left}px`;
        popover.style.top = `${buttonRect.top - parentRect.top - popover.offsetHeight}px`;
        popover.style.width = `${buttonRect.width}px`;
        popover.classList.add('visible');
        setTimeout(() => {
            document.addEventListener('click', (event) => {
                if (!popover.contains(event.target) && !button.contains(event.target)) popover.remove();
            }, { once: true });
        }, 0);
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sort-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function attachEventListeners() {
        sortSelectionDiv.addEventListener('click', e => {
            const addRuleButton = e.target.closest('#add-rule-btn');
            const deleteButton = e.target.closest('.delete-rule-btn');
            const dayDropdownItem = e.target.closest('.dropdown-item[data-day-index]');

            if (addRuleButton) {
                showRulePickerPopover(addRuleButton);
            } else if (deleteButton) {
                const ruleEl = deleteButton.closest('.sort-item');
                const instanceId = parseInt(ruleEl.dataset.instanceId, 10);
                activeSortRules = activeSortRules.filter(r => r.instanceId !== instanceId);
                render();
                onUpdateCallback();
            } else if (dayDropdownItem) {
                const ruleEl = dayDropdownItem.closest('.sort-item');
                const instanceId = parseInt(ruleEl.dataset.instanceId, 10);
                const newDayIndex = parseInt(dayDropdownItem.dataset.dayIndex, 10);
                const ruleToUpdate = activeSortRules.find(r => r.instanceId === instanceId);
                if (ruleToUpdate) {
                    ruleToUpdate.dayIndex = newDayIndex;
                    render();
                    onUpdateCallback();
                }
            }
        });

        sortSelectionDiv.addEventListener('dragstart', e => {
            if (e.target.classList.contains('sort-item')) e.target.classList.add('dragging');
        });
        sortSelectionDiv.addEventListener('dragend', e => {
            if (e.target.classList.contains('sort-item')) {
                e.target.classList.remove('dragging');
                const newOrderedIds = Array.from(sortSelectionDiv.querySelectorAll('.sort-item')).map(el => parseInt(el.dataset.instanceId, 10));
                activeSortRules.sort((a, b) => newOrderedIds.indexOf(a.instanceId) - newOrderedIds.indexOf(b.instanceId));
                onUpdateCallback();
            }
        });
        sortSelectionDiv.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(sortSelectionDiv, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (dragging) {
                const addBtn = sortSelectionDiv.querySelector('.add-item-btn');
                if (afterElement == null) sortSelectionDiv.insertBefore(dragging, addBtn);
                else sortSelectionDiv.insertBefore(dragging, afterElement);
            }
        });
    }

    return {
        init: (callback, sorterConfig, daysConfig) => {
            onUpdateCallback = callback;
            allSorters = sorterConfig;
            daysOfWeek = daysConfig;
            render();
            attachEventListeners();
        },
        getActiveRules: () => activeSortRules
    };
})();