<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, tick, onDestroy } from 'svelte';

	type Message = { role: 'user' | 'assistant'; content: string };

	let socket: WebSocket;
	let messages: Message[] = [];
	let text: string = '';
	let isConnected = false;
	let messageContainer: HTMLElement;
	let reconnectDelay = 1000;
	let heartbeatInterval: ReturnType<typeof setInterval>;

	// --- STEP 1: Get a unique ID for the user ---
	onMount(() => {
		let userSessionId = localStorage.getItem('userSessionId');
		if (!userSessionId) {
			userSessionId = crypto.randomUUID();
			localStorage.setItem('userSessionId', userSessionId);
		}
		// Connect to the user-specific branch
		connectAndLoadMessages(userSessionId);
	});
	
	async function connectAndLoadMessages(branchId: string) {
		isConnected = false;
		if (socket) socket.close();

		try {
			const historyRes = await fetch(`/api/chat/${branchId}`);
			if (historyRes.ok) {
				const history = await historyRes.json() as { role: 'user' | 'assistant'; content: string }[];
				messages = history.length > 1 ? history : [];
			} else {
				messages = [];
			}
		} catch (error) {
			console.error("Error fetching history:", error);
			messages = [];
		}

		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const wsUrl = `${protocol}://${window.location.host}/api/chat/${branchId}`;
		socket = new WebSocket(wsUrl);

		socket.onopen = () => {
			isConnected = true;
			reconnectDelay = 1000;
			heartbeatInterval = setInterval(() => {
				if (socket.readyState === 1) socket.send('ping');
			}, 20000);
		};

		socket.onmessage = (event) => {
			try {
				const newMessage = JSON.parse(event.data);
				messages = [...messages, newMessage];
			} catch (e) {
				console.error("Failed to parse incoming message:", event.data);
			}
		};
		
		socket.onclose = () => {
			isConnected = false;
			clearInterval(heartbeatInterval);
			
			// Use the user's ID for reconnects
			setTimeout(() => connectAndLoadMessages(branchId), reconnectDelay);
			if (reconnectDelay < 16000) reconnectDelay *= 2;
		};
	}

	onDestroy(() => {
		if (heartbeatInterval) clearInterval(heartbeatInterval);
		if (socket) socket.close();
	});

	function sendMessage() {
		if (isConnected && text.trim() !== '') {
			socket.send(text);
			text = '';
		}
	}
    
	async function scrollToBottom() {
		await tick();
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}

	$: if (messages) scrollToBottom();
</script>

<div class="flex flex-col h-screen bg-[#131314] text-gray-200 font-sans">
	<main class="flex-grow overflow-y-auto p-4 pt-8 hide-scrollbar" bind:this={messageContainer}>
		<div class="max-w-3xl mx-auto">
			{#each messages as message}
				<div class="message mb-8">
					<div class="flex" class:justify-end={message.role === 'user'}>
						<div class="max-w-prose">
							{#if message.role === 'assistant'}
								<p class="font-bold mb-2">Assistant</p>
								<p class="text-gray-300 break-words">{message.content}</p>
							{:else}
								<p class="font-bold mb-2 text-right">You</p>
								<p class="text-gray-300 break-words">{message.content}</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</main>

	<footer class="p-4">
		<div class="max-w-3xl mx-auto">
			<form on:submit|preventDefault={sendMessage} class="flex items-center gap-2 bg-[#1e1f20] rounded-xl p-3 border border-gray-700">
				<input
					type="text"
					bind:value={text}
					class="bg-transparent w-full focus:outline-none px-2"
					placeholder={isConnected ? 'Enter a prompt here' : 'Connecting...'}
					disabled={!isConnected}
				/>
				<button
					type="submit"
					class="w-8 h-8 flex-shrink-0 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 flex items-center justify-center"
					disabled={!isConnected || text.trim() === ''}
					aria-label="Send message"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
				</button>
			</form>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		background-color: #131314;
	}
    .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }
</style>