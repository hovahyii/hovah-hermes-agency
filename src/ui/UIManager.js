/**
 * UIManager — Owns all DOM rendering for the Command Center
 *
 * Responsibilities
 * ────────────────
 * 1. Create tab bar + tab panels
 * 2. Bind events (tabs, filters, clear buttons)
 * 3. Periodically read AgentState and push updates to the DOM
 */
export class UIManager {
    constructor(commandCenter) {
        this.commandCenter = commandCenter;
        this.agentState = commandCenter.agentState;

        this.activeTab = 'floor';
        this.tabs = ['floor', 'tasks', 'workflow', 'models', 'logs', 'analytics'];

        // DOM references — populated after init()
        this.tabBar = document.getElementById('tab-bar');
        this.tabPanelsContainer = document.getElementById('tab-panels-container');
        this.activityList = document.getElementById('activity-list');
        this.toastContainer = document.getElementById('toast-container');

        this.tabPanels = new Map();
        this.updateInterval = null;
    }

    /* ─────────── Bootstrap ─────────── */
    async init() {
        this.createTabBar();
        this.createTabPanels();
        this.bindEvents();
        this.startUpdateLoop();
        this.setActiveTab('floor');
    }

    /* ─────────── Tab Bar ─────────── */
    createTabBar() {
        if (!this.tabBar) return;

        const defs = [
            { id: 'floor',     label: 'Floor',     icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="2"/>' },
            { id: 'tasks',     label: 'Tasks',     icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
            { id: 'workflow',  label: 'Workflow',  icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
            { id: 'models',    label: 'Models',    icon: '<rect x="2" y="2" width="20" height="20" rx="2"/><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>' },
            { id: 'logs',      label: 'Logs',      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
            { id: 'analytics', label: 'Analytics', icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
        ];

        this.tabBar.innerHTML = defs.map(t => `
            <button class="tab-btn${t.id === 'floor' ? ' active' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === 'floor'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
                ${t.label}
            </button>
        `).join('');
    }

    /* ─────────── Tab Panels ─────────── */
    createTabPanels() {
        const panels = {
            floor: this._floorHTML(),
            tasks: this._tasksHTML(),
            workflow: this._workflowHTML(),
            models: '<div class="models-grid" id="models-grid"></div>',
            logs: this._logsHTML(),
            analytics: '<div class="analytics-grid" id="analytics-grid"></div>',
        };

        for (const [id, html] of Object.entries(panels)) {
            const el = document.createElement('div');
            el.className = `tab-panel${id === 'floor' ? ' active' : ''}`;
            el.id = `panel-${id}`;
            el.setAttribute('role', 'tabpanel');
            el.innerHTML = html;
            this.tabPanelsContainer.appendChild(el);
            this.tabPanels.set(id, el);
        }
    }

    /* ── Panel HTML fragments ── */
    _floorHTML() {
        return `
        <section class="execution-board" aria-label="Hermes execution board">
            <div class="execution-board__header">
                <div>
                    <span class="eyebrow">LIVE AGENT STATE</span>
                    <h2 id="board-title">Awaiting Hermes</h2>
                </div>
                <span class="board-badge connecting" id="board-badge">Connecting</span>
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

            <div class="connection-note" id="connection-note">
                Connect the Hermes Dashboard API to populate live sessions, model usage, and events.
            </div>
        </section>
        <section class="board-footnote">
            <span>Data source</span>
            <code>/api/status · /api/sessions · /api/analytics/usage</code>
        </section>`;
    }

    _tasksHTML() {
        return `
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
        </div>`;
    }

    _workflowHTML() {
        return `
        <section class="workflow-empty">
            <span class="eyebrow">WORKFLOW</span>
            <h2>Execution events appear here</h2>
            <p>This dashboard does not infer a workflow. It renders only nodes supplied by Hermes.</p>
        </section>`;
    }

    _logsHTML() {
        return `
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
        <div class="logs-list" id="logs-list"></div>`;
    }

    /* ─────────── Events ─────────── */
    bindEvents() {
        // Tab switching
        this.tabBar?.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setActiveTab(btn.dataset.tab));
        });

        // Task filter
        document.getElementById('task-filter')?.addEventListener('change', () => this.renderTasks());

        // Close task detail
        document.getElementById('close-task-detail')?.addEventListener('click', () => {
            document.getElementById('task-detail-panel')?.classList.add('hidden');
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

        // Log level filter
        document.getElementById('log-level-filter')?.addEventListener('change', () => this.renderLogs());
    }

    /* ─────────── Tab Logic ─────────── */
    setActiveTab(tab) {
        if (!this.tabs.includes(tab)) return;
        this.activeTab = tab;

        // Highlight button
        this.tabBar?.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
        });

        // Show panel
        this.tabPanels.forEach((panel, id) => {
            panel.classList.toggle('active', id === tab);
        });

        // Re-render active panel data
        if (tab === 'tasks')     this.renderTasks();
        if (tab === 'models')    this.updateModelsPanel();
        if (tab === 'logs')      this.renderLogs();
        if (tab === 'analytics') this.updateAnalyticsPanel();
    }

    /* ─────────── Update Loop ─────────── */
    startUpdateLoop() {
        // Throttled UI refresh at ~10 fps
        this.updateInterval = setInterval(() => this.update(), 100);
    }

    update() {
        this.updateHeader();
        this.updateExecutionBoard();
        this.renderActivity();
        this.renderExecutionSidebar();
        this.updateModelsPanel();
        this.updateAnalyticsPanel();
    }

    /* ─────────── Header ─────────── */
    updateHeader() {
        const state = this.agentState.getState();
        const conn = this.agentState.connection || { status: 'connecting' };

        // Connection badge
        const badge = document.getElementById('connection-badge');
        if (badge) {
            badge.className = `header__badge ${conn.status}`;
            badge.textContent = conn.status === 'connected' ? 'Online' : conn.status === 'disconnected' ? 'Offline' : 'Connecting…';
        }

        // Status
        const hdrStatus = document.getElementById('hdr-status');
        if (hdrStatus) {
            hdrStatus.textContent = _capitalize(state.status);
            hdrStatus.dataset.status = state.status;
        }

        // Model
        const hdrModel = document.getElementById('hdr-model');
        if (hdrModel) hdrModel.textContent = state.currentModel || '—';

        // Tokens
        const hdrTokens = document.getElementById('hdr-tokens');
        if (hdrTokens) hdrTokens.textContent = (state.tokens.total || 0).toLocaleString();

        // Task pill
        const pill = document.getElementById('hdr-task-pill');
        const taskVal = document.getElementById('hdr-task');
        if (pill && taskVal) {
            const hasTask = state.currentTask?.name;
            pill.classList.toggle('active', !!hasTask);
            taskVal.textContent = hasTask || 'No active task';
        }
    }

    /* ─────────── Execution Board (Floor) ─────────── */
    updateExecutionBoard() {
        const state = this.agentState.getState();
        const conn = this.agentState.connection || { status: 'connecting' };
        const connected = conn.status === 'connected';
        const active = state.status === 'working' || state.status === 'thinking';

        const el = (id) => document.getElementById(id);

        // Title / badge
        const title = el('board-title');
        if (title) title.textContent = active ? 'Agent is executing' : connected ? 'Hermes is ready' : 'Awaiting Hermes';

        const boardBadge = el('board-badge');
        if (boardBadge) {
            boardBadge.className = `board-badge ${connected ? 'connected' : conn.status}`;
            boardBadge.textContent = connected ? 'Connected' : _capitalize(conn.status);
        }

        // Context cards
        const bTask   = el('board-task');
        const bModel  = el('board-model');
        const bStatus = el('board-status');
        if (bTask)   bTask.textContent   = state.currentTask?.name || 'No active Hermes session';
        if (bModel)  bModel.textContent  = state.currentModel || '—';
        if (bStatus) bStatus.textContent = connected ? _capitalize(state.status) : 'API unavailable';

        // Note
        const note = el('connection-note');
        if (note) note.textContent = connected
            ? 'Synced from the local Hermes Dashboard API. No synthetic events are generated.'
            : 'Set HERMES_API_TARGET to your Hermes Dashboard URL, then restart Vite.';

        // Steps
        document.querySelectorAll('.execution-step').forEach((step, i) => {
            step.classList.toggle('active', connected && (active ? i < 4 : i === 0));
            step.classList.toggle('complete', connected && !active && i === 0);
            const small = step.querySelector('small');
            if (small) small.textContent = connected
                ? (active && i < 4 ? 'Active' : i === 0 ? 'Ready' : 'Waiting')
                : 'Offline';
        });
    }

    /* ─────────── Sidebar: Activity ─────────── */
    renderActivity() {
        if (!this.activityList) return;
        const items = this.agentState.activityLog.slice(0, 20);

        this.activityList.innerHTML = items.map(a => `
            <div class="activity-item ${a.type || ''}">
                <div class="activity-time">${_time(a.timestamp)}</div>
                <div class="activity-content">
                    <div class="activity-model ${a.model || ''}">${a.model || ''}</div>
                    <div class="activity-action">${a.action || ''}</div>
                    <div class="activity-task">${a.task || ''}</div>
                </div>
                <div class="activity-status ${a.status || ''}">${a.status || ''}</div>
                ${a.duration ? `<div class="activity-duration">${_duration(a.duration)}</div>` : ''}
            </div>
        `).join('');
    }

    /* ─────────── Sidebar: Execution Status ─────────── */
    renderExecutionSidebar() {
        const state = this.agentState.getState();
        const el = (id) => document.getElementById(id);

        const et = el('exec-task');
        const em = el('exec-model');
        const es = el('exec-status');
        const epb = el('exec-progress-bar');
        const ept = el('exec-progress-text');

        if (et) et.textContent  = state.currentTask?.name || 'No active task';
        if (em) em.textContent  = state.currentModel || '—';
        if (es) es.textContent  = _capitalize(state.status);
        if (epb) epb.style.width = `${state.taskProgress}%`;
        if (ept) ept.textContent = `${Math.round(state.taskProgress)}%`;
    }

    /* ─────────── Tasks Panel ─────────── */
    renderTasks() {
        const list = document.getElementById('tasks-list');
        if (!list) return;

        const filter = document.getElementById('task-filter')?.value || 'all';
        const tasks = [
            ...this.agentState.taskQueue.map(t => ({ ...t, source: 'queue' })),
            ...this.agentState.taskHistory.map(t => ({ ...t, source: 'history' })),
        ];
        const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

        if (filtered.length === 0) {
            list.innerHTML = '<div class="no-data">No tasks yet — start a Hermes session to populate this view.</div>';
            return;
        }

        list.innerHTML = filtered.map(t => `
            <div class="task-item ${t.status || ''}" data-task-id="${t.id}">
                <div class="task-status-indicator ${t.status || ''}"></div>
                <div class="task-info">
                    <div class="task-name">${t.name || 'Unnamed task'}</div>
                    <div class="task-meta">
                        <span class="task-model ${t.model || ''}">${t.model || ''}</span>
                        <span class="task-time">${_time(t.createdAt || t.timestamp)}</span>
                        ${t.duration ? `<span class="task-duration">${_duration(t.duration)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="view-task-btn" data-task-id="${t.id}">View</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.view-task-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showTaskDetail(btn.dataset.taskId));
        });
    }

    showTaskDetail(taskId) {
        const task = [...this.agentState.taskQueue, ...this.agentState.taskHistory].find(t => t.id === taskId);
        if (!task) return;

        const panel    = document.getElementById('task-detail-panel');
        const nameEl   = document.getElementById('detail-task-name');
        const timeline = document.getElementById('task-timeline');
        if (!panel || !nameEl || !timeline) return;

        nameEl.textContent = task.name;
        const events = task.events || [];
        timeline.innerHTML = events.map(e => `
            <div class="timeline-event ${e.status || ''}">
                <div class="log-time">${_time(e.timestamp)}</div>
                <div class="activity-model ${e.model || ''}">${e.model || ''}</div>
                <div class="activity-action">${e.action || ''}</div>
                ${e.tool  ? `<div class="log-tool">Tool: ${e.tool}</div>` : ''}
                ${e.error ? `<div style="color:var(--red)">Error: ${e.error}</div>` : ''}
                ${e.duration ? `<div class="activity-duration">${_duration(e.duration)}</div>` : ''}
            </div>
        `).join('');

        panel.classList.remove('hidden');
    }

    /* ─────────── Models Panel ─────────── */
    updateModelsPanel() {
        const grid = document.getElementById('models-grid');
        if (!grid) return;

        const m = this.agentState.modelMetrics;

        grid.innerHTML = `
            ${this._modelCard('nemotron', 'Nemotron', m.nemotron)}
            ${this._modelCard('mimo', 'MiMo', m.mimo)}
            ${this._modelCardOR(m.openrouter)}
        `;
    }

    _modelCard(cls, name, met) {
        return `
        <div class="model-card ${cls}">
            <div class="model-header">
                <h3>${name}</h3>
                <span class="model-status ${met.status}">${met.status}</span>
            </div>
            <div class="model-metrics">
                <div class="metric"><span class="metric-label">Latency</span><span class="metric-value">${met.latency}ms</span></div>
                <div class="metric"><span class="metric-label">Tokens</span><span class="metric-value">${met.tokens.toLocaleString()}</span></div>
                <div class="metric"><span class="metric-label">Calls</span><span class="metric-value">${met.calls}</span></div>
                <div class="metric"><span class="metric-label">Success</span><span class="metric-value success">${met.successful}</span></div>
                <div class="metric"><span class="metric-label">Failed</span><span class="metric-value error">${met.failed}</span></div>
            </div>
        </div>`;
    }

    _modelCardOR(met) {
        return `
        <div class="model-card openrouter">
            <div class="model-header">
                <h3>OpenRouter</h3>
                <span class="model-status ${met.status}">${met.status}</span>
            </div>
            <div class="model-current">
                <span class="current-model-label">Current:</span>
                <span class="current-model-value">${met.currentModel || 'Selecting…'}</span>
            </div>
            <div class="model-provider">
                <span class="provider-label">Provider:</span>
                <span class="provider-value">${met.provider || 'N/A'}</span>
            </div>
            <div class="model-metrics">
                <div class="metric"><span class="metric-label">Latency</span><span class="metric-value">${met.latency}ms</span></div>
                <div class="metric"><span class="metric-label">Tokens</span><span class="metric-value">${met.tokens.toLocaleString()}</span></div>
                <div class="metric"><span class="metric-label">Calls</span><span class="metric-value">${met.calls}</span></div>
                <div class="metric"><span class="metric-label">Cost</span><span class="metric-value">$${met.cost.toFixed(4)}</span></div>
                <div class="metric"><span class="metric-label">Success</span><span class="metric-value success">${met.successful}</span></div>
                <div class="metric"><span class="metric-label">Failed</span><span class="metric-value error">${met.failed}</span></div>
            </div>
        </div>`;
    }

    /* ─────────── Logs Panel ─────────── */
    renderLogs() {
        const list = document.getElementById('logs-list');
        if (!list) return;

        const filter = document.getElementById('log-level-filter')?.value || 'all';
        const logs = this.agentState.toolCalls.slice(0, 50);
        const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);

        if (filtered.length === 0) {
            list.innerHTML = '<div class="no-data">No log entries yet.</div>';
            return;
        }

        list.innerHTML = filtered.map(l => `
            <div class="log-item ${l.level || 'info'}">
                <div class="log-time">${_time(l.timestamp)}</div>
                <div class="log-tool">${l.tool || 'unknown'}</div>
                <div class="log-action">${l.action || 'Tool call'}</div>
                <div class="log-status ${l.status || 'started'}">${l.status || 'started'}</div>
                ${l.duration ? `<div class="log-duration">${_duration(l.duration)}</div>` : '<div></div>'}
            </div>
        `).join('');
    }

    /* ─────────── Analytics Panel ─────────── */
    updateAnalyticsPanel() {
        const grid = document.getElementById('analytics-grid');
        if (!grid) return;

        const state = this.agentState.getState();
        const hist = state.taskHistory;

        const total     = hist.length;
        const completed = hist.filter(t => t.status === 'completed').length;
        const failed    = hist.filter(t => t.status === 'failed').length;
        const avgDur    = total > 0 ? hist.reduce((s, t) => s + (t.duration || 0), 0) / total : 0;

        const modelUsage = {};
        hist.forEach(t => { modelUsage[t.model] = (modelUsage[t.model] || 0) + 1; });

        grid.innerHTML = `
            <div class="analytics-card">
                <h3>Task Statistics</h3>
                <div class="stat-grid">
                    <div class="stat"><span class="stat-value">${total}</span><span class="stat-label">Total Tasks</span></div>
                    <div class="stat success"><span class="stat-value">${completed}</span><span class="stat-label">Completed</span></div>
                    <div class="stat error"><span class="stat-value">${failed}</span><span class="stat-label">Failed</span></div>
                    <div class="stat"><span class="stat-value">${total > 0 ? Math.round((completed / total) * 100) : 0}%</span><span class="stat-label">Success Rate</span></div>
                </div>
            </div>
            <div class="analytics-card">
                <h3>Performance</h3>
                <div class="stat-grid">
                    <div class="stat"><span class="stat-value">${_duration(avgDur)}</span><span class="stat-label">Avg Duration</span></div>
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
                            <div class="usage-bar"><div class="usage-fill ${model}" style="width:${(count / total * 100) || 0}%"></div></div>
                            <span class="usage-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="analytics-card">
                <h3>Tool Usage</h3>
                <div class="tool-usage">${this._toolUsageHTML()}</div>
            </div>
        `;
    }

    _toolUsageHTML() {
        const calls = this.agentState.toolCalls;
        const usage = {};
        calls.forEach(c => { if (c.tool) usage[c.tool] = (usage[c.tool] || 0) + 1; });

        if (Object.keys(usage).length === 0) return '<div class="no-data">No tool calls recorded</div>';

        const total = Object.values(usage).reduce((a, b) => a + b, 0);
        return Object.entries(usage).map(([tool, count]) => `
            <div class="tool-usage-bar">
                <span class="tool-name">${tool}</span>
                <div class="usage-bar"><div class="usage-fill" style="width:${(count / total * 100)}%"></div></div>
                <span class="usage-count">${count}</span>
            </div>
        `).join('');
    }

    /* ─────────── Toast ─────────── */
    showToast(message, type = 'info') {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        `;
        this.toastContainer.appendChild(toast);

        toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove());

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        }, 5000);
    }

    /* ─────────── Cleanup ─────────── */
    dispose() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.tabPanels.forEach(p => { p.innerHTML = ''; });
        this.tabPanels.clear();
    }
}

/* ───────── helpers ───────── */

function _capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function _time(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
}

function _duration(ms) {
    if (!ms || ms <= 0) return '0s';
    if (ms < 1000)  return `${Math.round(ms)}ms`;
    const sec = Math.floor(ms / 1000);
    if (sec < 60)   return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s`;
}
