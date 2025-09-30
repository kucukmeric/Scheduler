import { config } from './modules/config.js';
import { Section, generateTimetables } from './modules/core.js';
import { renderSingleTimetable } from './modules/ui/timetableRenderer.js';
import { CourseManager } from './modules/ui/courseManager.js';
import { SortableList } from './modules/ui/sortableList.js';

(async function() {
    // --- STATE MANAGEMENT ---
    let allGeneratedTimetables = [];
    let currentIndex = 0;
    let isAnimating = false;
    let scrollQueue = 0; // Hızlı kaydırma için istek kuyruğu

    // --- DOM ELEMENT REFERENCES ---
    const feedbackDiv = document.getElementById('feedback');
    const timetableArea = document.getElementById('timetable-area');
    const scroller = document.getElementById('timetable-scroller');
    const slots = Array.from(scroller.children); // 5 slotu dinamik olarak al
    const downloadBtn = document.getElementById('download-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-input');

    // --- CORE LOGIC & DATA PROCESSING ---
    async function loadAndProcessData() {
        try {
            const response = await fetch('courses.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const departmentsData = await response.json();
            const allCoursesFlat = [];
            departmentsData.forEach(dept => {
                dept.courses.forEach(course => {
                    const hydratedCourse = { ...course, sections: course.sections.map(s => new Section(`${course.code}-${s.num}`, s.instructor, s.blocks)) };
                    allCoursesFlat.push(hydratedCourse);
                });
            });
            return { departments: departmentsData, allCourses: allCoursesFlat };
        } catch (error) {
            console.error("Failed to load course data:", error);
            feedbackDiv.innerText = "Error: Could not load course data.";
            return { departments: [], allCourses: [] };
        }
    }

    function applySorters(results) {
        const activeSortRules = SortableList.getActiveRules();
        return results.sort((a, b) => {
            for (const sorter of activeSortRules) {
                let scoreA, scoreB;
                if (sorter.dayIndex !== undefined) { 
                    scoreA = a.dayScore[sorter.dayIndex]; 
                    scoreB = b.dayScore[sorter.dayIndex]; 
                } else { 
                    scoreA = a[sorter.scoreKey]; 
                    scoreB = b[sorter.scoreKey]; 
                }
                if (scoreA !== scoreB) return scoreA - scoreB;
            }
            return 0;
        });
    }
    
    const hashTimetable = (timetable) => {
        return timetable.selection.map(s => s.id).sort().join('_');
    };

    // --- YENİ ANİMASYONLU KAYDIRMA MANTIĞI ---

    /**
     * Görünen 5 slotun içeriğini ve pozisyonlarını mevcut indekse göre anında ayarlar.
     */
    function updateView() {
        slots.forEach(slot => {
            slot.innerHTML = ''; // Tüm slotları temizle
            slot.classList.remove('is-active');
        });

        if (allGeneratedTimetables.length === 0) return;
        
        const total = allGeneratedTimetables.length;
        const indices = [
            (currentIndex - 2 + total * 5) % total, // Negatif sonuçları engellemek için büyük bir kat ekle
            (currentIndex - 1 + total * 5) % total,
            currentIndex,
            (currentIndex + 1) % total,
            (currentIndex + 2) % total
        ];

        // Slotların başlangıç pozisyonlarını ve içeriklerini ayarla
        indices.forEach((dataIndex, slotIndex) => {
            const slot = slots[slotIndex];
            // Ortadaki slottan uzaklığına göre dikey pozisyonunu ayarla
            slot.style.transform = `translateY(${(slotIndex - 2) * 100}%)`;
            slot.classList.remove('is-active');

            if (total === 1 && slotIndex !== 2) return; // Tek eleman varsa sadece ortayı doldur
            if (total === 2 && (slotIndex === 0 || slotIndex === 4)) return; // İki eleman varsa kenarları boş bırak

            const timetableData = allGeneratedTimetables[dataIndex];
            const wrapper = renderSingleTimetable(timetableData, dataIndex, config.days, config.hours, config.colors);
            
            if(wrapper) {
                slot.appendChild(wrapper);
            }
        });

        slots[2].classList.add('is-active'); // Ortadaki slot her zaman aktiftir
    }

    /**
     * Kaydırma kuyruğunu işleyen ve animasyonları yöneten ana fonksiyon.
     */
    function processScrollQueue() {
        if (isAnimating || scrollQueue === 0) return;

        isAnimating = true;
        const direction = scrollQueue > 0 ? 'down' : 'up';

        // Kuyruktan bir istek al
        if (direction === 'down') scrollQueue--;
        else scrollQueue++;

        // Tüm slotları kaydır
        slots.forEach(slot => {
            const currentY = parseFloat(slot.style.transform.replace(/translateY\((.+)%\)/, '$1'));
            slot.style.transform = `translateY(${currentY + (direction === 'up' ? 100 : -100)}%)`;
        });
    }
    
    /**
     * Fare tekerleği olayını yakalar ve kaydırma kuyruğuna ekler.
     */
    function handleWheel(event) {
        event.preventDefault();
        if (allGeneratedTimetables.length <= 1) return;

        // Her tekerlek hareketi için kuyruğa bir istek ekle
        scrollQueue += Math.sign(event.deltaY);
        
        // Animasyon döngüsünü başlat/devam ettir
        processScrollQueue();
    }
    
    /**
     * CSS animasyonu bittiğinde tetiklenir, durumu günceller ve sistemi sıfırlar.
     */
    function onTransitionEnd(event) {
        // Sadece slotların transform animasyonu bittiğinde çalış
        if (!isAnimating || event.propertyName !== 'transform') return;

        // Geçişin hangi yönde bittiğini transform değerinden anla
        const movedSlot = event.target;
        const transformValue = movedSlot.style.transform;
        const yValue = parseFloat(transformValue.replace(/translateY\((.+)%\)/, '$1'));
        
        // Eğer bir slot -200%'e ulaştıysa (yukarı kaydıysa) veya +200%'e ulaştıysa (aşağı kaydıysa) bu bitiş animasyonudur
        if (Math.abs(yValue) < 200) return;

        const direction = yValue > 0 ? 'up' : 'down';

        // Yeni indeksi hesapla
        if (direction === 'down') {
            currentIndex = (currentIndex + 1) % allGeneratedTimetables.length;
            // En üstteki slotu en alta taşı (DOM'da yer değiştir)
            scroller.appendChild(slots.shift());
        } else {
            currentIndex = (currentIndex - 1 + allGeneratedTimetables.length) % allGeneratedTimetables.length;
            // En alttaki slotu en üste taşı
            scroller.insertBefore(slots.pop(), slots[0]);
        }
        
        // Slot dizisini yeniden sırala
        slots.splice(0, slots.length, ...scroller.children);
        
        // Görünümü yeni duruma göre anında güncelle
        updateView();
        
        isAnimating = false; // Kilidi aç
        
        // Kuyrukta hala istek varsa, bir sonraki animasyonu başlat
        setTimeout(processScrollQueue, 0);
    }

    // --- BUTON FONKSİYONLARI ---
    const handleExport = () => {
        const highlightedTimetable = allGeneratedTimetables[currentIndex];
        if (!highlightedTimetable) return;

        const exportData = {
            timetableId: highlightedTimetable.id,
            selectedCourses: CourseManager.getUserCourses()
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ischeduler_export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.selectedCourses || !Array.isArray(data.selectedCourses)) {
                    throw new Error("Invalid file format.");
                }
                CourseManager.setUserCourses(data.selectedCourses);
                generateAndRender();
            } catch (error) {
                feedbackDiv.innerText = `Error: Could not import file. ${error.message}`;
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };
    
    const handleDownload = () => {
        const highlightedEl = document.querySelector('.is-active .timetable-wrapper');
        if (highlightedEl && window.html2canvas) {
            html2canvas(highlightedEl, { 
                useCORS: true, 
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-background').trim()
            }).then(canvas => {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = 'timetable.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        }
    };

    // --- ANA RENDER FONKSİYONU ---
    function generateAndRender() {
        const userCourses = CourseManager.getUserCourses();
        const allCourses = CourseManager.getAllCourses();

        if (userCourses.length === 0) {
            allGeneratedTimetables = [];
            feedbackDiv.innerText = "Please add a course to begin.";
            feedbackDiv.classList.add('feedback-initial');
            downloadBtn.disabled = true;
            exportBtn.disabled = true;
            updateView();
            return;
        } else {
            feedbackDiv.classList.remove('feedback-initial');
        }

        const results = [];
        try {
            generateTimetables(userCourses, allCourses, 0, [0, 0], [], results);
            const sorted = applySorters(results);
            allGeneratedTimetables = sorted.map(r => ({ ...r, id: hashTimetable(r) }));
            
            if (allGeneratedTimetables.length > 0) {
                feedbackDiv.innerText = `Generated ${allGeneratedTimetables.length} possible timetables.`;
                downloadBtn.disabled = false;
                exportBtn.disabled = false;
            } else {
                feedbackDiv.innerText = "No possible timetables found with this combination.";
                downloadBtn.disabled = true;
                exportBtn.disabled = true;
            }

            currentIndex = 0;
            scrollQueue = 0;
            updateView();
            
        } catch (e) { 
            feedbackDiv.innerText = `Error: ${e}`; 
            console.error(e); 
            allGeneratedTimetables = [];
            updateView();
        }
    }

    // --- BAŞLATMA ---
    (async () => {
        const { departments, allCourses } = await loadAndProcessData();
        if (allCourses.length > 0) {
            CourseManager.init(generateAndRender, departments, allCourses);
            SortableList.init(generateAndRender, config.sorters, config.days);
            
            timetableArea.addEventListener('wheel', handleWheel, { passive: false });
            scroller.addEventListener('transitionend', onTransitionEnd);

            generateAndRender();
        }
    })();

    // --- DİĞER OLAY DİNLEYİCİLERİ ---
    downloadBtn.addEventListener('click', handleDownload);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importInput.click());
    importBtn.addEventListener('change', handleImport);
})();