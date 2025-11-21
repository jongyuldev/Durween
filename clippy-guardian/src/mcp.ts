import { spawn, ChildProcess } from 'child_process';

export class MCPClient {
    private serverProcess: ChildProcess | null = null;
    private requestID = 0;
    private pendingRequests = new Map<number, (result: any) => void>();

    constructor(private serverCommand: string, private serverArgs: string[]) {}

    connect() {
        try {
            console.log(`Connecting to MCP Server: ${this.serverCommand} ${this.serverArgs.join(' ')}`);
            this.serverProcess = spawn(this.serverCommand, this.serverArgs);

            this.serverProcess.stdout?.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const response = JSON.parse(line);
                        if (response.id && this.pendingRequests.has(response.id)) {
                            const resolve = this.pendingRequests.get(response.id);
                            resolve && resolve(response.result);
                            this.pendingRequests.delete(response.id);
                        }
                    } catch (e) {
                        console.error("Failed to parse MCP response:", e);
                    }
                }
            });

            this.serverProcess.stderr?.on('data', (data) => {
                console.error(`MCP Server Error: ${data}`);
            });

            console.log("MCP Server connected (simulated).");
        } catch (e) {
            console.error("Failed to start MCP server:", e);
        }
    }

    async getContext(query: string): Promise<string> {
        // In a real app, this would send a JSON-RPC request
        // return this.sendRequest('resources/read', { uri: query });
        
        // For the hackathon demo, we simulate a response
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(`[MCP Context] Analysis of ${query}: Code looks clean, but lacks comments.`);
            }, 500);
        });
    }

    private sendRequest(method: string, params: any): Promise<any> {
        return new Promise((resolve) => {
            const id = this.requestID++;
            this.pendingRequests.set(id, resolve);
            const request = { jsonrpc: "2.0", id, method, params };
            this.serverProcess?.stdin?.write(JSON.stringify(request) + '\n');
        });
    }
}
