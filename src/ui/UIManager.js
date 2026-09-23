export class UIManager {
    constructor(commandCenter) {
        this.commandCenter = commandCenter;
        this.agentState = commandCenter.agentState;
        
        this.activeTab = 'floor';
        this.tabs = ['floor', 'tasks', 'workflow', 'models', 'logs', 'analytics'];
        
        this.activityPanel = null;
        this.topDashboard = null;
        this.tabPanels = new Map();
        this.toastContainer = null;
        
        this.updateInterval = null;
    }

    async init() {
        this.createTopDashboard();
        this.createTabBar();
        this.createTabPanels();
        this.createActivityPanel();
        this.createToastContainer();
        this.bindEvents();
        this.startUpdateLoop();
        
        // Set initial tab
        this.setActiveTab('floor');
    }

    createTopDashboard() {
        const dashboard = document.createElement('div');
        dashboard.className = 'top-dashboard';
        dashboard.innerHTML = `
            <div class="command-brand">
                <span class="brand-orb"></span>
                <div><strong>AI Agent Command Center</strong><small>One agent · live execution view</small></div>
            </div>
            <div class="dashboard-section status-section">
                <div class="dashboard-label">Agent Status</div>
                <div class="dashboard-value" id="agent-status">
                    <span class="status-indicator" id="status-indicator"></span>
                    <span id="status-text">Online</span>
                </div>
            </div>
            <div class="dashboard-section model-section">
                <div class="dashboard-label">Current Model</div>
                <div class="dashboard-value" id="current-model">
                    <span class="model-badge" id="model-badge">Nemotron</span>
                </div>
            </div>
            <div class="dashboard-section task-section">
                <div class="dashboard-label">Current Task</div>
                <div class="dashboard-value" id="current-task">
                    <span id="task-name">Idle</span>
                </div>
            </div>
            <div class="dashboard-section progress-section">
                <div class="dashboard-label">Task Progress</div>
                <div class="dashboard-value">
                    <div class="progress-bar" id="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <span id="progress-text">0%</span>
                </div>
            </div>
            <div class="dashboard-section runtime-section">
                <div class="dashboard-label">Runtime</div>
                <div class="dashboard-value" id="runtime">00:00.000</div>
            </div>
            <div class="dashboard-section tokens-section">
                <div class="dashboard-label">Tokens</div>
                <div class="dashboard-value" id="tokens">
                    <span id="tokens-in">0</span> in / <span id="tokens-out">0</span> out
                </div>
            </div>
        `;
        document.body.appendChild(dashboard);
        this.topDashboard = dashboard;
    }

    createTabBar() {
        const tabBar = document.createElement('div');
        tabBar.className = 'tab-bar';
        tabBar.innerHTML = `
            <div class="tab-buttons">
                <button class="tab-btn active" data-tab="floor">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="12" cy="12" r="2"/>
                    </svg>
                    Floor
                </button>
                <button class="tab-btn" data-tab="tasks">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Tasks
                </button>
                <button class="tab-btn" data-tab="workflow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <rect x="14" y="14" width="7" height="7" rx="1"/>
                        <line x1="10" y1="6.5" x2="10" y2="10"/>
                        <line x1="6.5" y1="10" x2="10" y2="10"/>
                        <line x1="14" y1="10" x2="17.5" y2="10"/>
                        <line x1="17.5" y1="6.5" x2="17.5" y2="10"/>
                        <line x1="10" y1="14" x2="10" y2="17.5"/>
                        <line x1="6.5" y1="17.5" x2="10" y2="17.5"/>
                    </svg>
                    Workflow
                </button>
                <button class="tab-btn" data-tab="models">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="2"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                        <line x1="6" y1="18" x2="18" y2="6"/>
                    </svg>
                    Models
                </button>
                <button class="tab-btn" data-tab="logs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    Logs
                </button>
                <button class="tab-btn" data-tab="analytics">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    Analytics
                </button>
            </div>
        `;
        document.body.appendChild(tabBar);
        this.tabBar = tabBar;
    }

    createTabPanels() {
        // Primary view: an execution board instead of a decorative 3D scene.
        const floorPanel = this.createPanel('floor', `
            <section class="execution-board" aria-label="Hermes execution board">
                <div class="execution-board-header">
                    <div><span class="eyebrow">LIVE AGENT STATE</span><h2 id="board-title">Awaiting Hermes</h2></div>
                    <span class="connection-badge connecting" id="connection-badge">Connecting</span>
                </div>
                <div class="execution-steps" id="execution-steps">
                    <div class="execution-step"><span>1</span><strong>Request</strong><small>Waiting</small></div>
                    <div class="execution-step"><span>2</span><strong>Plan</strong><small>Waiting</small></div>
                    <div class="execution-step"><span>3</span><strong>Model</strong><small>Waiting</small></div>
                    <div class="execution-step"><span>4</span><strong>Tool</strong><small>Waiting</small></div>
                    <div class="execution-step"><span>5</span><strong>Verify</strong><small>Waiting</small></div>
                </div>
                <div class="execution-context">
                    <article><span>Current task</span><strong id="board-task">No active Hermes session</strong></article>
                    <article><span>Model</span><strong id="board-model">—</strong></article>
                    <article><span>Session status</span><strong id="board-status">Checking API</strong></article>
                </div>
                <div class="connection-note" id="connection-note">Connect the Hermes Dashboard API to populate live sessions, model usage, and events.</div>
            </section>
            <section class="board-footnote">
                <span>Data source</span><code>/api/status · /api/sessions · /api/analytics/usage</code>
            </section>
        `);

        // Tasks panel
        const tasksPanel = this.createPanel('tasks', `
            <div class="tasks-header">
                <h2>Task Queue & History</h2>
                <div class="tasks-filters">
                    <select id="task-filter">
                        <option value="all">All</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>
            <div class="tasks-list" id="tasks-list"></div>
            <div class="task-detail-panel hidden" id="task-detail-panel">
                <div class="task-detail-header">
                    <h3 id="detail-task-name"></h3>
                    <button class="close-detail-btn" id="close-task-detail">×</button>
                </div>
                <div class="task-timeline" id="task-timeline"></div>
            </div>
        `);

        // Workflow data is shown as a readable event view until Hermes sends nodes.
        const workflowPanel = this.createPanel('workflow', `
            <section class="workflow-empty"><span class="eyebrow">WORKFLOW</span><h2>Execution events appear here</h2><p>This dashboard does not infer a workflow. It renders only nodes supplied by Hermes.</p></section>
        `);

        // Models panel
        const modelsPanel = this.createPanel('models', `
            <div class="models-grid" id="models-grid"></div>
        `);

        // Logs panel
        const logsPanel = this.createPanel('logs', `
            <div class="logs-header">
                <h2>Tool Calls & Execution Events</h2>
                <div class="logs-filters">
                    <select id="log-level-filter">
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                    </select>
                    <button class="clear-logs-btn" id="clear-logs">Clear</button>
                </div>
            </div>
            <div class="logs-list" id="logs-list"></div>
        `);

        // Analytics panel
        const analyticsPanel = this.createPanel('analytics', `
            <div class="analytics-grid" id="analytics-grid"></div>
        `);

        this.tabPanels.set('floor', floorPanel);
        this.tabPanels.set('tasks', tasksPanel);
        this.tabPanels.set('workflow', workflowPanel);
        this.tabPanels.set('models', modelsPanel);
        this.tabPanels.set('logs', logsPanel);
        this.tabPanels.set('analytics', analyticsPanel);
    }

    createPanel(id, content) {
        const panel = document.createElement('div');
        panel.className = `tab-panel ${id === 'floor' ? 'active' : ''}`;
        panel.id = `panel-${id}`;
        panel.innerHTML = content;
        document.body.appendChild(panel);
        return panel;
    }

    createActivityPanel() {
        const panel = document.createElement('div');
        panel.className = 'activity-panel';
        panel.innerHTML = `
            <div class="activity-header">
                <h3>Live Activity</h3>
                <button class="clear-activity-btn" id="clear-activity">Clear</button>
            </div>
            <div class="activity-list" id="activity-list"></div>
        `;
        document.body.appendChild(panel);
        this.activityPanel = panel;

        const executionBar = document.createElement('div');
        executionBar.className = 'execution-bar';
        executionBar.innerHTML = `
            <span class="execution-kicker">ACTIVE EXECUTION</span>
            <span class="execution-task" id="execution-task">No active task</span>
            <span class="execution-hint">Avatar moves only when the connected agent changes state</span>
        `;
        document.body.appendChild(executionBar);
        this.executionBar = executionBar;
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toast-container';
        document.body.appendChild(container);
        this.toastContainer = container;
    }

    bindEvents() {
        // Tab buttons
        this.tabBar.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setActiveTab(btn.dataset.tab));
        });

        // Task filter
        const taskFilter = document.getElementById('task-filter');
        if (taskFilter) {
            taskFilter.addEventListener('change', () => this.renderTasks());
        }

        // Close task detail
        const closeDetail = document.getElementById('close-task-detail');
        if (closeDetail) {
            closeDetail.addEventListener('click', () => this.hideTaskDetail());
        }

        // Workflow layout buttons
        document.querySelectorAll('.workflow-controls .control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.workflow-controls .control-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.commandCenter.workflowScene) {
                    this.commandCenter.workflowScene.layout = btn.dataset.layout;
                    this.commandCenter.workflowScene.layoutNodes();
                }
            });
        });

        // Clear activity
        document.getElementById('clear-activity')?.addEventListener('click', () => {
            this.agentState.activityLog = [];
            this.renderActivity();
        });

        // Clear logs
        document.getElementById('clear-logs')?.addEventListener('click', () => {
            this.agentState.toolCalls = [];
            this.renderLogs();
        });
    }

    setActiveTab(tab) {
        if (!this.tabs.includes(tab)) return;
        
        this.activeTab = tab;
        
        // Update tab buttons
        this.tabBar.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Update panels
        this.tabPanels.forEach((panel, id) => {
            panel.classList.toggle('active', id === tab);
        });
        
    }

    startUpdateLoop() {
        this.updateInterval = setInterval(() => this.update(), 100);
    }

    update() {
        this.updateTopDashboard();
        this.updateExecutionBoard();
        this.updateActivityPanel();
        this.updateModelsPanel();
        this.updateAnalyticsPanel();
    }

    updateTopDashboard() {
        const state = this.agentState.getState();
        
        // Status
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        if (statusIndicator && statusText) {
            statusIndicator.className = `status-indicator ${state.status}`;
            statusText.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
        }
        
        // Model
        const modelBadge = document.getElementById('model-badge');
        if (modelBadge) {
            modelBadge.className = `model-badge ${state.currentModel}`;
            modelBadge.textContent = state.currentModel.charAt(0).toUpperCase() + state.currentModel.slice(1);
        }
        
        // Task
        const taskName = document.getElementById('task-name');
        if (taskName) {
            taskName.textContent = state.currentTask?.name || 'Idle';
        }
        const executionTask = document.getElementById('execution-task');
        if (executionTask) {
            executionTask.textContent = state.currentTask?.name || 'No active task';
        }
        
        // Progress
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        if (progressFill && progressText) {
            progressFill.style.width = `${state.taskProgress}%`;
            progressText.textContent = `${Math.round(state.taskProgress)}%`;
        }
        
        // Runtime
        const runtime = document.getElementById('runtime');
        if (runtime) {
            const ms = state.runtime;
            const seconds = Math.floor(ms / 1000) % 60;
            const minutes = Math.floor(ms / 60000) % 60;
            const milliseconds = ms % 1000;
            runtime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        }
        
        // Tokens
        const tokensIn = document.getElementById('tokens-in');
        const tokensOut = document.getElementById('tokens-out');
        if (tokensIn && tokensOut) {
            tokensIn.textContent = state.tokens.input.toLocaleString();
            tokensOut.textContent = state.tokens.output.toLocaleString();
        }
    }

    updateExecutionBoard() {
        const state = this.agentState.getState();
        const connection = this.agentState.connection || { status: 'connecting', detail: 'Connecting to Hermes' };
        const connected = connection.status === 'connected';
        const active = state.status === 'working' || state.status === 'thinking';
        const badge = document.getElementById('connection-badge');
        const title = document.getElementById('board-title');
        const task = document.getElementById('board-task');
        const model = document.getElementById('board-model');
        const status = document.getElementById('board-status');
        const note = document.getElementById('connection-note');
        if (badge) { badge.className = `connection-badge ${connection.status}`; badge.textContent = connected ? 'Hermes connected' : connection.status; }
        if (title) title.textContent = active ? 'Agent is executing' : connected ? 'Hermes is ready' : 'Awaiting Hermes';
        if (task) task.textContent = state.currentTask?.name || 'No active Hermes session';
        if (model) model.textContent = state.currentModel || '—';
        if (status) status.textContent = connected ? state.status : 'API unavailable';
        if (note) note.textContent = connected ? 'Synced from the local Hermes Dashboard API. No synthetic events are generated.' : 'Set HERMES_API_TARGET to your Hermes Dashboard URL, then restart Vite.';
        document.querySelectorAll('.execution-step').forEach((step, index) => {
            step.classList.toggle('active', connected && (active ? index < 4 : index === 0));
            step.classList.toggle('complete', connected && !active && index === 0);
            step.querySelector('small').textContent = connected ? (active && index < 4 ? 'Active' : index === 0 ? 'Ready' : 'Waiting') : 'Offline';
        });
    }

    updateActivityPanel() {
        const list = document.getElementById('activity-list');
        if (!list) return;
        
        const activities = this.agentState.activityLog.slice(0, 20);
        
        list.innerHTML = activities.map(activity => `
            <div class="activity-item ${activity.type}">
                <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                <div class="activity-content">
                    <div class="activity-model ${activity.model}">${activity.model}</div>
                    <div class="activity-action">${activity.action}</div>
                    <div class="activity-task">${activity.task}</div>
                </div>
                <div class="activity-status ${activity.status}">${activity.status}</div>
                ${activity.duration ? `<div class="activity-duration">${this.formatDuration(activity.duration)}</div>` : ''}
            </div>
        `).join('');
    }

    renderTasks() {
        const list = document.getElementById('tasks-list');
        if (!list) return;
        
        const filter = document.getElementById('task-filter')?.value || 'all';
        const tasks = [
            ...this.agentState.taskQueue.map(t => ({ ...t, source: 'queue' })),
            ...this.agentState.taskHistory.map(t => ({ ...t, source: 'history' }))
        ];
        
        const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
        
        list.innerHTML = filtered.map(task => `
            <div class="task-item ${task.status}" data-task-id="${task.id}">
                <div class="task-status-indicator ${task.status}"></div>
                <div class="task-info">
                    <div class="task-name">${task.name}</div>
                    <div class="task-meta">
                        <span class="task-model ${task.model}">${task.model}</span>
                        <span class="task-time">${this.formatTime(task.createdAt || task.timestamp)}</span>
                        ${task.duration ? `<span class="task-duration">${this.formatDuration(task.duration)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="view-task-btn" data-task-id="${task.id}">View</button>
                </div>
            </div>
        `).join('');
        
        // Bind view buttons
        list.querySelectorAll('.view-task-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showTaskDetail(btn.dataset.taskId));
        });
    }

    showTaskDetail(taskId) {
        const task = [...this.agentState.taskQueue, ...this.agentState.taskHistory].find(t => t.id === taskId);
        if (!task) return;
        
        const panel = document.getElementById('task-detail-panel');
        const nameEl = document.getElementById('detail-task-name');
        const timeline = document.getElementById('task-timeline');
        
        if (panel && nameEl && timeline) {
            nameEl.textContent = task.name;
            
            // Build timeline from task events
            const events = task.events || [];
            timeline.innerHTML = events.map((event, i) => `
                <div class="timeline-event ${event.status}">
                    <div class="timeline-time">${this.formatTime(event.timestamp)}</div>
                    <div class="timeline-content">
                        <div class="timeline-model ${event.model}">${event.model}</div>
                        <div class="timeline-action">${event.action}</div>
                        ${event.tool ? `<div class="timeline-tool">Tool: ${event.tool}</div>` : ''}
                        ${event.input ? `<div class="timeline-input">${JSON.stringify(event.input).slice(0, 100)}</div>` : ''}
                        ${event.output ? `<div class="timeline-output">${JSON.stringify(event.output).slice(0, 100)}</div>` : ''}
                        ${event.error ? `<div class="timeline-error">Error: ${event.error}</div>` : ''}
                        ${event.duration ? `<div class="timeline-duration">${this.formatDuration(event.duration)}</div>` : ''}
                    </div>
                </div>
            `).join('');
            
            panel.classList.remove('hidden');
        }
    }

    hideTaskDetail() {
        document.getElementById('task-detail-panel')?.classList.add('hidden');
    }

    updateModelsPanel() {
        const grid = document.getElementById('models-grid');
        if (!grid) return;
        
        const metrics = this.agentState.modelMetrics;
        
        grid.innerHTML = `
            <div class="model-card nemotron">
                <div class="model-header">
                    <h3>Nemotron</h3>
                    <span class="model-status ${metrics.nemotron.status}">${metrics.nemotron.status}</span>
                </div>
                <div class="model-metrics">
                    <div class="metric"><span class="metric-label">Latency</span><span class="metric-value">${metrics.nemotron.latency}ms</span></div>
                    <div class="metric"><span class="metric-label">Tokens</span><span class="metric-value">${metrics.nemotron.tokens.toLocaleString()}</span></div>
                    <div class="metric"><span class="metric-label">Calls</span><span class="metric-value">${metrics.nemotron.calls}</span></div>
                    <div class="metric"><span class="metric-label">Success</span><span class="metric-value success">${metrics.nemotron.successful}</span></div>
                    <div class="metric"><span class="metric-label">Failed</span><span class="metric-value error">${metrics.nemotron.failed}</span></div>
                </div>
            </div>
            <div class="model-card mimo">
                <div class="model-header">
                    <h3>MiMo</h3>
                    <span class="model-status ${metrics.mimo.status}">${metrics.mimo.status}</span>
                </div>
                <div class="model-metrics">
                    <div class="metric"><span class="metric-label">Latency</span><span class="metric-value">${metrics.mimo.latency}ms</span></div>
                    <div class="metric"><span class="metric-label">Tokens</span><span class="metric-value">${metrics.mimo.tokens.toLocaleString()}</span></div>
                    <div class="metric"><span class="metric-label">Calls</span><span class="metric-value">${metrics.mimo.calls}</span></div>
                    <div class="metric"><span class="metric-label">Success</span><span class="metric-value success">${metrics.mimo.successful}</span></div>
                    <div class="metric"><span class="metric-label">Failed</span><span class="metric-value error">${metrics.mimo.failed}</span></div>
                </div>
            </div>
            <div class="model-card openrouter">
                <div class="model-header">
                    <h3>OpenRouter</h3>
                    <span class="model-status ${metrics.openrouter.status}">${metrics.openrouter.status}</span>
                </div>
                <div class="model-current">
                    <span class="current-model-label">Current:</span>
                    <span class="current-model-value" id="openrouter-current">${metrics.openrouter.currentModel || 'Selecting...'}</span>
                </div>
                <div class="model-provider">
                    <span class="provider-label">Provider:</span>
                    <span class="provider-value" id="openrouter-provider">${metrics.openrouter.provider || 'N/A'}</span>
                </div>
                <div class="model-metrics">
                    <div class="metric"><span class="metric-label">Latency</span><span class="metric-value">${metrics.openrouter.latency}ms</span></div>
                    <div class="metric"><span class="metric-label">Tokens</span><span class="metric-value">${metrics.openrouter.tokens.toLocaleString()}</span></div>
                    <div class="metric"><span class="metric-label">Calls</span><span class="metric-value">${metrics.openrouter.calls}</span></div>
                    <div class="metric"><span class="metric-label">Cost</span><span class="metric-value">$${metrics.openrouter.cost.toFixed(4)}</span></div>
                    <div class="metric"><span class="metric-label">Success</span><span class="metric-value success">${metrics.openrouter.successful}</span></div>
                    <div class="metric"><span class="metric-label">Failed</span><span class="metric-value error">${metrics.openrouter.failed}</span></div>
                </div>
            </div>
        `;
    }

    updateAnalyticsPanel() {
        const grid = document.getElementById('analytics-grid');
        if (!grid) return;
        
        const state = this.agentState.getState();
        const history = state.taskHistory;
        
        const totalTasks = history.length;
        const completedTasks = history.filter(t => t.status === 'completed').length;
        const failedTasks = history.filter(t => t.status === 'failed').length;
        const avgDuration = history.length > 0 
            ? history.reduce((sum, t) => sum + (t.duration || 0), 0) / history.length 
            : 0;
        
        const modelUsage = {};
        history.forEach(t => {
            modelUsage[t.model] = (modelUsage[t.model] || 0) + 1;
        });
        
        grid.innerHTML = `
            <div class="analytics-card">
                <h3>Task Statistics</h3>
                <div class="stat-grid">
                    <div class="stat"><span class="stat-value">${totalTasks}</span><span class="stat-label">Total Tasks</span></div>
                    <div class="stat success"><span class="stat-value">${completedTasks}</span><span class="stat-label">Completed</span></div>
                    <div class="stat error"><span class="stat-value">${failedTasks}</span><span class="stat-label">Failed</span></div>
                    <div class="stat"><span class="stat-value">${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span><span class="stat-label">Success Rate</span></div>
                </div>
            </div>
            <div class="analytics-card">
                <h3>Performance</h3>
                <div class="stat-grid">
                    <div class="stat"><span class="stat-value">${this.formatDuration(avgDuration)}</span><span class="stat-label">Avg Duration</span></div>
                    <div class="stat"><span class="stat-value">${state.tokens.total.toLocaleString()}</span><span class="stat-label">Total Tokens</span></div>
                    <div class="stat"><span class="stat-value">${state.tokens.input.toLocaleString()}</span><span class="stat-label">Input Tokens</span></div>
                    <div class="stat"><span class="stat-value">${state.tokens.output.toLocaleString()}</span><span class="stat-label">Output Tokens</span></div>
                </div>
            </div>
            <div class="analytics-card">
                <h3>Model Usage</h3>
                <div class="model-usage">
                    ${Object.entries(modelUsage).map(([model, count]) => `
                        <div class="model-usage-bar">
                            <span class="model-name ${model}">${model}</span>
                            <div class="usage-bar"><div class="usage-fill ${model}" style="width: ${(count / totalTasks * 100) || 0}%"></div></div>
                            <span class="usage-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="analytics-card">
                <h3>Tool Usage</h3>
                <div class="tool-usage">
                    ${this.getToolUsageStats()}
                </div>
            </div>
        `;
    }

    getToolUsageStats() {
        const toolCalls = this.agentState.toolCalls;
        const usage = {};
        
        toolCalls.forEach(call => {
            if (call.tool) {
                usage[call.tool] = (usage[call.tool] || 0) + 1;
            }
        });
        
        if (Object.keys(usage).length === 0) {
            return '<div class="no-data">No tool calls recorded</div>';
        }
        
        const total = Object.values(usage).reduce((a, b) => a + b, 0);
        
        return Object.entries(usage).map(([tool, count]) => `
            <div class="tool-usage-bar">
                <span class="tool-name">${tool}</span>
                <div class="usage-bar"><div class="usage-fill" style="width: ${(count / total * 100)}%"></div></div>
                <span class="usage-count">${count}</span>
            </div>
        `).join('');
    }

    renderLogs() {
        const list = document.getElementById('logs-list');
        if (!list) return;
        
        const filter = document.getElementById('log-level-filter')?.value || 'all';
        const logs = this.agentState.toolCalls.slice(0, 50);
        
        const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);
        
        list.innerHTML = filtered.map(log => `
            <div class="log-item ${log.level || 'info'}">
                <div class="log-time">${this.formatTime(log.timestamp)}</div>
                <div class="log-tool">${log.tool || 'unknown'}</div>
                <div class="log-action">${log.action || 'Tool call'}</div>
                <div class="log-status ${log.status || 'started'}">${log.status || 'started'}</div>
                ${log.duration ? `<div class="log-duration">${this.formatDuration(log.duration)}</div>` : ''}
            </div>
        `).join('');
    }

    showStationDetails(stationId) {
        // Could show a tooltip or side panel with station details
        console.log('[UIManager] Station selected:', stationId);
    }

    showWorkflowNodeDetails(node) {
        // Show node details in a tooltip or panel
        console.log('[UIManager] Workflow node selected:', node.id);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        `;
        
        this.toastContainer.appendChild(toast);
        
        toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove());
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });
    }

    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.topDashboard?.remove();
        this.tabBar?.remove();
        this.tabPanels.forEach(panel => panel.remove());
        this.activityPanel?.remove();
        this.toastContainer?.remove();
    }
}
