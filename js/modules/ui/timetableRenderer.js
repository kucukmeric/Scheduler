export function renderSingleTimetable(timetable, index, days, hours, colors) {
    if (!timetable) return null;

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
        for (let d = 0; d < days.length; d++) {
            let cellContent = '';
            if (h === 4) {
                cellContent = `<div class='lunch'>LUNCH</div>`;
            } else {
                const blockIndex = d * hours.length + h;
                for (const section of timetable.selection) {
                    if (section.blocks.includes(blockIndex)) {
                        const courseCode = section.id.split('-')[0];
                        const color = courseToColor.get(courseCode);
                        cellContent = `<div class="occupied" style='--course-color: ${color}'>
                            <div class='occupied-cell-content' data-info='${section.id} | ${section.instructor}'>
                                ${courseCode}<br/>(${section.instructor.split(' ').pop()})
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
    
    // Oluşturulan elemanı döndür
    return wrapper; 
}