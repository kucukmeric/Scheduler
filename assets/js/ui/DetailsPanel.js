export class DetailsPanel {
    constructor() {
        this.detailsContainer = document.getElementById('details-panel');
        this.downloadBtn = document.getElementById('download-btn');
        this.exportBtn = document.getElementById('export-btn');
    }

    render(schedule) {
        let detailsHtml = `
            <div class="details-section">
                <h4 class="details-title">Selected Courses</h4>
                <ul class="details-list">
                    ${schedule.selection.map(s => `
                        <li>
                            <strong>${s.id.split('-')[0]} - Sec ${s.id.split('-')[1]}</strong>
                            <span>${s.instructor}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="details-section">
                <h4 class="details-title">Schedule Scores</h4>
                <ul class="details-list scores">
                    <li><span>Gap Score:</span> <strong>${schedule.gapScore}</strong></li>
                    <li><span>Morning Score:</span> <strong>${schedule.morningScore}</strong></li>
                    <li><span>Short Day Score:</span> <strong>${schedule.shortDayScore}</strong></li>
                </ul>
            </div>
        `;
        this.detailsContainer.innerHTML = detailsHtml;
        this.detailsContainer.classList.add('visible');
        this.downloadBtn.disabled = false;
        this.exportBtn.disabled = false;
    }

    clear() {
        this.detailsContainer.innerHTML = '';
        this.detailsContainer.classList.remove('visible');
        this.downloadBtn.disabled = true;
        this.exportBtn.disabled = true;
    }
}