import type { DurableObjectState, DurableObjectNamespace } from "@cloudflare/workers-types";

// AI message format
interface AiMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}


export class ConversationBranch {
	state: DurableObjectState;
	env: Env;
	messages: AiMessage[];
	webSocket?: WebSocket;
	initialized: boolean;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		this.messages = []; // no messages initially
		this.initialized = false;
	}

	// Ensure initialization happens only once
	async initialize() {
		if (!this.initialized) {
			// initial system message
			this.messages = (await this.state.storage.get('messages')) || [
				{ role: 'system', content: 'You are a helpful assistant.' },
			];
			this.initialized = true;
		}
	}

	async fetch(request: Request) {
		// initialize on first request
		await this.initialize();


		// Check if it's a WebSocket upgrade request
		if (request.headers.get("Upgrade") === "websocket") {
			const [client, server] = Object.values(new WebSocketPair());
			this.webSocket = server;
			server.accept();

			server.addEventListener("message", async (event) => {
				try {
					const incomingMessage = String(event.data);

					if (incomingMessage === 'ping') {
						return; // Do nothing for pings
					}


					const userMessage: AiMessage = { role: 'user', content: incomingMessage };
					this.messages.push(userMessage);

					
					server.send(JSON.stringify(userMessage));

					this.state.storage.put('messages', this.messages);

					const aiResponse = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
						messages: this.messages,
					});

					const assistantMessage: AiMessage = { role: 'assistant', content: aiResponse.response! };
					this.messages.push(assistantMessage);

					server.send(JSON.stringify(assistantMessage));

					await this.state.storage.put('messages', this.messages);

				} catch (error) {
					console.error("--- ERROR IN AI HANDLER ---", error);
					const errorMessage = { role: 'assistant', content: 'Sorry, an error occurred.' };
					server.send(JSON.stringify(errorMessage));
				}
			});

			return new Response(null, { status: 101, webSocket: client });
		}

		// return history
		if (request.method === "GET") {
			return new Response(JSON.stringify(this.messages), {
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-cache, no-store, must-revalidate",
					"Pragma": "no-cache",
					"Expires": "0",
				},
			});
		}

		// load history
		if (request.method === "POST") {
			this.messages = await request.json();
			return new Response("History loaded", { status: 200 });
		}

		return new Response("Method not allowed", { status: 405 });
	}

}

interface Env {
	CONVERSATION_BRANCH: DurableObjectNamespace;
	AI: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // This fetch handler is required for the Worker to be valid, but it won't
    // be called directly in our Pages application architecture.
    // We'll just forward any requests to a default DO instance.
    let id = env.CONVERSATION_BRANCH.idFromName("default-instance");
    let stub = env.CONVERSATION_BRANCH.get(id);
    return stub.fetch(request);
  }
}