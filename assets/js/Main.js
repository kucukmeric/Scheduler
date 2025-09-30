import { UIManager } from './ui/UIManager.js';
import { load } from './services/courseLoader.js';

(async () => {
    try {
        const courseData = await load();
        const uiManager = new UIManager(courseData);
        uiManager.init();
    } catch (error) {
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px;">
            <h2>Failed to load application</h2>
            <p>Could not load course data. Please check the network connection and the 'courses.json' file.</p>
        </div>`;
        console.error("Application initialization failed:", error);
    }
})();