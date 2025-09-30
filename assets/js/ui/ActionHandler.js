export class ActionHandler {
    constructor() {
        this.importBtn = document.getElementById('import-btn');
        this.importInput = document.getElementById('import-input');
        this.exportBtn = document.getElementById('export-btn');
        this.downloadBtn = document.getElementById('download-btn');
    }

    init(callbacks) {
        this.importBtn.addEventListener('click', () => this.importInput.click());
        this.importInput.addEventListener('change', (e) => this._handleImport(e, callbacks.onImport));
        this.exportBtn.addEventListener('click', () => this._handleExport(callbacks.getExportData));
        this.downloadBtn.addEventListener('click', () => this._handleDownload(callbacks.getDownloadData));
    }

    _handleExport(getExportData) {
        const exportData = getExportData();
        if (!exportData) return;

        const dataStr = JSON.stringify({ selectedCourses: exportData }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ischeduler_export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    _handleImport(event, onImport) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.selectedCourses || !Array.isArray(data.selectedCourses)) {
                    throw new Error("Invalid file format: 'selectedCourses' array not found.");
                }
                onImport(data.selectedCourses);
            } catch (error) {
                alert(`Error: Could not import file. ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    
    _handleDownload(getDownloadData) {
        const downloadData = getDownloadData();
        if (!downloadData || !downloadData.card || !window.html2canvas) return;

        html2canvas(downloadData.card, { 
            useCORS: true, 
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-background').trim()
        }).then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `schedule_option_${downloadData.index + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }
}