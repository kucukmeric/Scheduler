// REMOVED the (function() { ... })(); wrapper to conform to the ES Module pattern.

let activeSortRules = [];
let nextRuleInstanceId = 0;
let onUpdateCallback = () => {};
let allSorters = [];
let daysOfWeek = [];

// Target the new container for the list items
const sortSelectionListDiv = document.getElementById('sort-selection-list');

function render() {
    // Only clear the list container, not the entire section
    sortSelectionListDiv.innerHTML = ''; 
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
        sortSelectionListDiv.appendChild(ruleEl);
    });
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

    popover.style.top = `${buttonRect.top - parentRect.top + buttonRect.height + 4}px`;
    popover.style.right = `${parentRect.right - buttonRect.right - buttonRect.width / 2}px`;
    popover.style.width = `200px`;
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
    const sortingSection = document.getElementById('sorting-section');

    sortingSection.addEventListener('click', e => {
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

    sortSelectionListDiv.addEventListener('dragstart', e => {
        if (e.target.classList.contains('sort-item')) e.target.classList.add('dragging');
    });
    sortSelectionListDiv.addEventListener('dragend', e => {
        if (e.target.classList.contains('sort-item')) {
            e.target.classList.remove('dragging');
            const newOrderedIds = Array.from(sortSelectionListDiv.querySelectorAll('.sort-item')).map(el => parseInt(el.dataset.instanceId, 10));
            activeSortRules.sort((a, b) => newOrderedIds.indexOf(a.instanceId) - newOrderedIds.indexOf(b.instanceId));
            onUpdateCallback();
        }
    });
    sortSelectionListDiv.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(sortSelectionListDiv, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (dragging) {
            if (afterElement == null) sortSelectionListDiv.appendChild(dragging);
            else sortSelectionListDiv.insertBefore(dragging, afterElement);
        }
    });
}

// CORRECTED: Export the object so it can be imported by main.js
export const SortableList = {
    init: (callback, sorterConfig, daysConfig) => {
        onUpdateCallback = callback;
        allSorters = sorterConfig;
        daysOfWeek = daysConfig;
        render();
        attachEventListeners();
    },
    getActiveRules: () => activeSortRules
};