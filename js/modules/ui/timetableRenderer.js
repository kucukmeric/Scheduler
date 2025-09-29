export function renderTimetable(timetable, index, days, hours, colors) {
    const timetableContainer = document.getElementById('timetable-container');
    if (!timetableContainer) return;

    const courseToColor = new Map();
    let colorIndex = 0;
    timetable.selection.forEach(section => {
        const courseCode = section.id.split('-')[0];
        if (!courseToColor.has(courseCode)) {
            courseToColor.set(courseCode, colors[colorIndex % colors.length]);
            colorIndex++;
        }
    });

    let headerHtml = `<thead><tr><th></th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead>`;
    let bodyHtml = '<tbody>';
    
    // Iterate through each hour of the day
    for (let h = 0; h < hours.length; h++) {
        bodyHtml += `<tr><th>${hours[h]}</th>`;
        
        // Iterate through each day of the week
        for (let d = 0; d < days.length; d++) {
            let cellContent = '';
            
            // The 5th hour (index 4) is always Lunch
            if (h === 4) {
                cellContent = `<div class='lunch'>LUNCH</div>`;
            } else {
                // Calculate the absolute block index for the current day and hour
                const blockIndex = d * hours.length + h;
                
                // Find if any selected section occupies this block
                for (const section of timetable.selection) {
                    if (section.blocks.includes(blockIndex)) {
                        const courseCode = section.id.split('-')[0];
                        const color = courseToColor.get(courseCode);
                        // REFACTORED: Use a CSS custom property instead of an inline style.
                        cellContent = `<div class="occupied" style='--course-color: ${color}'>
                            <div class='occupied-cell-content' data-info='${section.id} | ${section.instructor}'>
                                ${courseCode}<br/>(${section.instructor.split(' ').pop()})
                            </div>
                        </div>`;
                        break; // Found the section for this block, no need to check others
                    }
                }
            }
            bodyHtml += `<td>${cellContent}</td>`;
        }
        bodyHtml += `</tr>`;
    }
    bodyHtml += '</tbody>';

    const wrapper = document.createElement('div');
    wrapper.className = 'timetable-wrapper';
    wrapper.innerHTML = `
        <h3>Timetable Option ${index + 1}</h3>
        <table>${headerHtml}${bodyHtml}</table>
    `;
    timetableContainer.appendChild(wrapper);
}
