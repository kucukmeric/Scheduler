function renderTimetable(timetable, index, days, hours, colors) {
    const timetableContainer = document.getElementById('timetable-container');
    if (!timetableContainer) return '';

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
    for (let h = 0; h < hours.length; h++) {
        bodyHtml += `<tr><th>${hours[h]}</th>`;
        for (let d = 0; d < 5; d++) {
            let cellContent = '';
            let isOccupied = false;

            if (h === 4) {
                cellContent = `<div class='lunch'>LUNCH</div>`;
            } else {
                let logicalHour = h < 4 ? Math.floor(h / 2) : Math.floor((h - 1) / 2);
                let bitToCheck = (d * 4) + logicalHour;
                for (let s of timetable.selection) {
                    if (s.blocks.includes(bitToCheck)) {
                        const courseCode = s.id.split('-')[0];
                        let color = courseToColor.get(courseCode);
                        isOccupied = true;
                        cellContent = `<div class="occupied" style='background:${color}'>
                            <div class='occupied-cell-content' data-info='${s.id} | ${s.instructor}'>
                                ${s.id.split('-')[0]}<br/>(${s.instructor})
                            </div>
                        </div>`;
                        break;
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