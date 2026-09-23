import './style.css';
import { CommandCenter } from './core/CommandCenter.js';

// Initialize the command center when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new CommandCenter();
    app.init();
    
    // Make globally accessible for debugging
    window.commandCenter = app;
});