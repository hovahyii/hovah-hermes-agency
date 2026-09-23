import { EventEmitter } from './EventEmitter.js';

export class AgentState extends EventEmitter {
    constructor() {
        super();
        this.reset();
    }

    reset() {
        this.status = 'idle'; // idle, thinking, working, waiting, error, online
        this.currentModel = 'nemotron'; // nemotron, mimo, openrouter
        this.currentTask = null;
        this.taskProgress = 0;
        this.taskStartTime = null;
        this.runtime = 0;
        this.tokens = { input: 0, output: 0, total: 0 };
        this.modelTokens = { nemotron: { input: 0, output: 0 }, mimo: { input: 0, output: 0 }, openrouter: { input: 0, output: 0 } };
        
        this.activityLog = [];
        this.maxActivityLog = 100;
        
        this.toolCalls = [];
        this.maxToolCalls = 50;
        
        this.taskQueue = [];
        this.taskHistory = [];
        this.maxHistory = 50;
        
        this.workflowNodes = [];
        this.workflowEdges = [];
        this.activeWorkflowNode = null;
        
        this.modelMetrics = {
            nemotron: { status: 'ready', latency: 0, tokens: 0, calls: 0, successful: 0, failed: 0 },
            mimo: { status: 'ready', latency: 0, tokens: 0, calls: 0, successful: 0, failed: 0 },
            openrouter: { status: 'ready', latency: 0, tokens: 0, calls: 0, successful: 0, failed: 0, currentModel: null, provider: null, cost: 0 }
        };
        
        this.currentWorkflow = null;
        this.agentPosition = 'command-desk'; // current workstation
        this.targetPosition = 'command-desk';
        this.isMoving = false;
        this.connection = { status: 'connecting', detail: 'Connecting to Hermes' };
    }

    update(delta) {
        // Update runtime if task is active
        if (this.taskStartTime && this.status === 'working') {
            this.runtime = Date.now() - this.taskStartTime;
        }
        
        // State is driven by Hermes snapshots; visual state is rendered by the execution board.
    }

    setTask(task) {
        this.currentTask = task;
        this.taskProgress = 0;
        this.taskStartTime = Date.now();
        this.runtime = 0;
        this.status = 'thinking';
        this.targetPosition = 'planning-desk';
        this.isMoving = true;
        
        this.addActivity({
            type: 'task_received',
            model: this.currentModel,
            action: 'Task received',
            task: task.name || 'Unknown task',
            status: 'active',
            timestamp: Date.now()
        });
        
        this.emit('task:changed', task);
    }

    setModel(model) {
        const prevModel = this.currentModel;
        this.currentModel = model;
        
        // Determine target workstation based on model
        const modelStations = {
            nemotron: 'nemotron-station',
            mimo: 'mimo-station',
            openrouter: 'openrouter-station'
        };
        
        this.targetPosition = modelStations[model] || 'command-desk';
        this.isMoving = true;
        
        this.addActivity({
            type: 'model_changed',
            model: model,
            action: `Switched to ${model}`,
            task: this.currentTask?.name || 'No active task',
            status: 'active',
            timestamp: Date.now()
        });
        
        this.emit('model:changed', { model, prevModel });
    }

    addActivity(event) {
        const enrichedEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...event
        };
        
        this.activityLog.unshift(enrichedEvent);
        if (this.activityLog.length > this.maxActivityLog) {
            this.activityLog.pop();
        }
        
        this.emit('activity:added', enrichedEvent);
    }

    addToolCall(toolCall) {
        const enrichedCall = {
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...toolCall
        };
        
        this.toolCalls.unshift(enrichedCall);
        if (this.toolCalls.length > this.maxToolCalls) {
            this.toolCalls.pop();
        }
        
        // Update status based on tool
        const toolStations = {
            browser: 'browser-station',
            terminal: 'terminal-station',
            code: 'coding-station',
            files: 'files-station',
            memory: 'memory-station',
            search: 'browser-station',
            test: 'testing-station'
        };
        
        if (toolCall.tool && toolStations[toolCall.tool]) {
            this.targetPosition = toolStations[toolCall.tool];
            this.isMoving = true;
        }
        
        this.status = 'working';
        this.emit('tool:call', enrichedCall);
    }

    completeTask(result) {
        this.status = 'online';
        this.taskProgress = 100;
        this.targetPosition = 'command-desk';
        this.isMoving = true;
        
        if (this.currentTask) {
            this.taskHistory.unshift({
                ...this.currentTask,
                completedAt: Date.now(),
                duration: this.runtime,
                result,
                model: this.currentModel
            });
            if (this.taskHistory.length > this.maxHistory) {
                this.taskHistory.pop();
            }
        }
        
        this.addActivity({
            type: 'task_complete',
            model: this.currentModel,
            action: 'Task completed',
            task: this.currentTask?.name || 'Unknown task',
            status: 'completed',
            duration: this.runtime,
            timestamp: Date.now()
        });
        
        this.currentTask = null;
        this.taskStartTime = null;
        this.emit('task:completed', result);
    }

    errorTask(error) {
        this.status = 'error';
        this.targetPosition = 'command-desk';
        this.isMoving = true;
        
        this.addActivity({
            type: 'task_error',
            model: this.currentModel,
            action: 'Task failed',
            task: this.currentTask?.name || 'Unknown task',
            status: 'failed',
            error: error.message,
            timestamp: Date.now()
        });
        
        this.emit('task:error', error);
    }

    updateModelMetrics(model, metrics) {
        if (this.modelMetrics[model]) {
            this.modelMetrics[model] = { ...this.modelMetrics[model], ...metrics };
            this.emit('metrics:changed', { model, metrics: this.modelMetrics[model] });
        }
    }

    updateTokens(input, output, model) {
        this.tokens.input += input;
        this.tokens.output += output;
        this.tokens.total = this.tokens.input + this.tokens.output;
        
        if (model && this.modelTokens[model]) {
            this.modelTokens[model].input += input;
            this.modelTokens[model].output += output;
        }
        
        this.emit('tokens:changed', this.tokens);
    }

    setWorkflow(workflow) {
        this.currentWorkflow = workflow;
        this.workflowNodes = workflow.nodes || [];
        this.workflowEdges = workflow.edges || [];
        this.emit('workflow:changed', workflow);
    }

    setActiveWorkflowNode(nodeId) {
        this.activeWorkflowNode = nodeId;
        const node = this.workflowNodes.find(n => n.id === nodeId);
        if (node) {
            node.status = 'active';
        }
        this.emit('workflow:node:active', nodeId);
    }

    completeWorkflowNode(nodeId, status = 'completed') {
        const node = this.workflowNodes.find(n => n.id === nodeId);
        if (node) {
            node.status = status;
            node.completedAt = Date.now();
        }
        this.emit('workflow:node:complete', { nodeId, status });
    }

    getState() {
        return {
            status: this.status,
            currentModel: this.currentModel,
            currentTask: this.currentTask,
            taskProgress: this.taskProgress,
            runtime: this.runtime,
            tokens: this.tokens,
            modelTokens: this.modelTokens,
            activityLog: this.activityLog,
            toolCalls: this.toolCalls,
            taskQueue: this.taskQueue,
            taskHistory: this.taskHistory,
            workflowNodes: this.workflowNodes,
            workflowEdges: this.workflowEdges,
            activeWorkflowNode: this.activeWorkflowNode,
            modelMetrics: this.modelMetrics,
            agentPosition: this.agentPosition,
            targetPosition: this.targetPosition,
            isMoving: this.isMoving
        };
    }

}
