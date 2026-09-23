import { EventEmitter } from './EventEmitter.js';
import { UIManager } from '../ui/UIManager.js';
import { AgentState } from './AgentState.js';
import { DataBridge } from './DataBridge.js';
import { FloorScene } from '../scene/FloorScene.js';

export class CommandCenter extends EventEmitter {
    constructor() {
        super();
        this.initialized = false;
        this.uiManager = null;
        this.agentState = null;
        this.dataBridge = null;
        this.floorScene = null;
        this.animationId = null;
        this.lastTime = 0;
    }

    async init() {
        try {
            // Show loading
            this.showLoading(true);

            // Initialize core systems
            this.agentState = new AgentState();
            this.dataBridge = new DataBridge(this.agentState);
            
            // Initialize UI Manager
            this.uiManager = new UIManager(this);
            await this.uiManager.init();

            // Initialize 3D Floor Scene
            const canvasContainer = document.getElementById('canvas-container');
            if (canvasContainer) {
                this.floorScene = new FloorScene(canvasContainer);
                this.floorScene.setCommandCenter(this);
            }

            // Start the Hermes bridge in background (non-blocking)
            this.dataBridge.connect();

            // Start render loop immediately
            this.startRenderLoop();

            // Hide loading
            this.showLoading(false);
            this.initialized = true;

            this.emit('ready');
            console.log('[CommandCenter] Initialized successfully');
        } catch (error) {
            console.error('[CommandCenter] Initialization failed:', error);
            this.showLoading(false);
            this.showError('Failed to initialize Command Center');
        }
    }

    startRenderLoop() {
        const animate = (time) => {
            const delta = (time - this.lastTime) / 1000;
            this.lastTime = time;

            this.update(delta);
            this.render();

            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    update(delta) {
        // Update agent state
        this.agentState.update(delta);

        // Update UI
        if (this.uiManager) this.uiManager.update(delta);
        
        // Update 3D Floor Scene
        if (this.floorScene) this.floorScene.update(delta);
    }

    render() {
        // Render 3D scene
        if (this.floorScene) this.floorScene.render();
    }

    // Public API for external events (from Hermes agent)
    onTaskReceived(task) {
        this.agentState.setTask(task);
        this.emit('task:received', task);
    }

    onModelChanged(model) {
        this.agentState.setModel(model);
        this.emit('model:changed', model);
    }

    onActivityEvent(event) {
        this.agentState.addActivity(event);
        this.emit('activity', event);
    }

    onToolCall(toolCall) {
        this.agentState.addToolCall(toolCall);
        this.emit('tool:call', toolCall);
    }

    onTaskComplete(result) {
        this.agentState.completeTask(result);
        this.emit('task:complete', result);
    }

    onTaskError(error) {
        this.agentState.errorTask(error);
        this.emit('task:error', error);
    }

    // Metrics updates
    updateModelMetrics(model, metrics) {
        this.agentState.updateModelMetrics(model, metrics);
        this.emit('metrics:update', { model, metrics });
    }

    updateTokenUsage(input, output, model) {
        this.agentState.updateTokens(input, output, model);
        this.emit('tokens:update', { input, output, model });
    }

    // Tab management
    setActiveTab(tab) {
        this.uiManager.setActiveTab(tab);
    }

    getActiveTab() {
        return this.uiManager.activeTab;
    }

    // Cleanup
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.uiManager) this.uiManager.dispose();
        if (this.floorScene) this.floorScene.dispose();
        if (this.dataBridge) this.dataBridge.disconnect();
        this.initialized = false;
    }

    showLoading(show) {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            if (show) overlay.classList.remove('hidden');
            else overlay.classList.add('hidden');
        }
    }

    showError(message) {
        this.uiManager.showToast(message, 'error');
    }
}
