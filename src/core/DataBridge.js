/** Read-only adapter for the local Hermes dashboard API. */
export class DataBridge {
    constructor(agentState) {
        this.agentState = agentState;
        this.connected = false;
        this.pollInterval = null;
        this.apiBase = (import.meta.env.VITE_HERMES_API_BASE || '/hermes').replace(/\/$/, '');
        this.lastSnapshot = '';
        this.sessionToken = null;
        this.tokenExpiry = 0;
    }

    async connect() {
        // Fetch session token from Hermes dashboard before starting polling
        await this.fetchSessionToken();
        this.startPolling();
    }

    async fetchSessionToken() {
        try {
            const response = await fetch(`${this.apiBase}/`, {
                headers: { Accept: 'text/html' }
            });
            if (!response.ok) throw new Error(`Dashboard HTML ${response.status}`);
            const html = await response.text();
            
            // Extract session token from window.__HERMES_SESSION_TOKEN__
            const match = html.match(/window\.__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);
            if (match) {
                this.sessionToken = match[1];
                this.tokenExpiry = Date.now() + 30 * 60 * 1000; // Assume 30 min validity
                console.log('[DataBridge] Session token acquired');
            } else {
                console.warn('[DataBridge] No session token found in dashboard HTML');
            }
        } catch (error) {
            console.error('[DataBridge] Failed to fetch session token:', error);
        }
    }

    async ensureValidToken() {
        // Refresh token if expired or not set
        if (!this.sessionToken || Date.now() >= this.tokenExpiry) {
            await this.fetchSessionToken();
        }
        return this.sessionToken;
    }

    startPolling() {
        if (this.pollInterval) return;
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), 3000);
    }

    async fetchJson(path) {
        const token = await this.ensureValidToken();
        const headers = { Accept: 'application/json' };
        if (token) {
            headers['X-Hermes-Session-Token'] = token;
        }
        
        const response = await fetch(`${this.apiBase}${path}`, { headers });
        
        // If 401, token may have expired - force refresh and retry once
        if (response.status === 401 && token) {
            this.sessionToken = null;
            const newToken = await this.ensureValidToken();
            if (newToken) {
                headers['X-Hermes-Session-Token'] = newToken;
                const retryResponse = await fetch(`${this.apiBase}${path}`, { headers });
                if (retryResponse.ok) return retryResponse.json();
            }
        }
        
        if (!response.ok) throw new Error(`Hermes API ${response.status}`);
        return response.json();
    }

    async poll() {
        try {
            const [status, sessions, usage] = await Promise.all([
                this.fetchJson('/api/status'),
                this.fetchJson('/api/sessions?limit=1'),
                this.fetchJson('/api/analytics/usage?days=1')
            ]);
            this.connected = true;
            this.agentState.connection = { status: 'connected', detail: 'Hermes dashboard API' };
            this.applyHermesSnapshot(status, sessions, usage);
        } catch (error) {
            this.connected = false;
            this.agentState.connection = { status: 'disconnected', detail: 'Hermes API unavailable' };
            this.agentState.emit('connection:changed', this.agentState.connection);
            console.error('[DataBridge] Poll error:', error);
        }
    }

    applyHermesSnapshot(status, sessionsResponse, usageResponse) {
        const session = sessionsResponse.sessions?.[0];
        const totals = usageResponse.totals || {};
        const model = session?.model || this.agentState.currentModel;
        const taskName = session?.title || session?.name || session?.summary || null;
        const isActive = Boolean(session?.is_active || status.active_sessions > 0);
        const state = {
            status: isActive ? 'working' : 'idle',
            currentModel: model,
            currentTask: isActive && taskName ? { name: taskName } : null,
            tokens: {
                input: Number(totals.total_input || 0),
                output: Number(totals.total_output || 0),
                total: Number(totals.total_input || 0) + Number(totals.total_output || 0)
            }
        };
        const signature = JSON.stringify(state);
        if (signature === this.lastSnapshot) return;
        this.lastSnapshot = signature;
        this.handleStateSync(state);
        this.agentState.addActivity({
            type: 'hermes_sync', model, action: isActive ? 'Hermes session active' : 'Hermes is idle',
            task: taskName || 'No active task', status: isActive ? 'active' : 'completed', timestamp: Date.now()
        });
    }

    handleStateSync(state) {
        if (state.status) this.agentState.status = state.status;
        if (state.currentModel) this.agentState.currentModel = state.currentModel;
        this.agentState.currentTask = state.currentTask || null;
        if (state.tokens) this.agentState.tokens = state.tokens;
        this.agentState.emit('state:synced', state);
    }

    disconnect() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = null;
        this.connected = false;
    }

    isConnected() { return this.connected; }
}