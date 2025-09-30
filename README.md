# Branching AI Chatbot

A full-stack AI chat application built on the Cloudflare stack, featuring the ability to branch conversations and explore different lines of inquiry.

**Live Demo:** **[https://branch-ai.pages.dev](https://branch-ai.pages.dev)**

---

## Features

This project fulfills the assignment requirements by implementing:

* **LLM Integration**: Connects to the Llama 3 model via **Cloudflare Workers AI**.
* **Stateful Workflow**: Uses **Cloudflare Durable Objects** to maintain a persistent, independent state for each conversation branch.
* **Real-time User Input**: A responsive chat interface built with **SvelteKit** that communicates with the backend via WebSockets.
* **Persistent Memory**: Conversation history is saved to the Durable Object's persistent storage, surviving deployments and inactivity.
* **Conversation Branching**: Users can create a new branch from any point in the assistant's conversation, saving the context and allowing for parallel chat histories.

---

## Architecture

This application uses a two-project "microservice" architecture, which is a standard pattern for using stateful Durable Objects with a Cloudflare Pages frontend.

* **`branch-ai-do` (Backend)**
    * A dedicated Cloudflare Worker whose sole purpose is to provide the `ConversationBranch` Durable Object class.
    * It handles all stateful logic, including storing chat history and communicating with the Workers AI service.

* **`branch-ai` (Frontend)**
    * A SvelteKit application deployed to Cloudflare Pages.
    * It contains all UI components and a SvelteKit API route that acts as a router, forwarding requests to the `branch-ai-do` backend worker.

---

## Local Development

To run this project on your local machine, you'll need two terminals.

### Prerequisites

1.  **Node.js**: Make sure you have a recent version of Node.js installed.
2.  **Wrangler Login**: Authenticate with your Cloudflare account by running `npx wrangler login`.

### Running the Application

1.  **Start the Backend Worker**
    * In your first terminal, navigate to the backend project directory and start the Wrangler dev server. This will run your Durable Object on `localhost:8788`.
    ```bash
    cd branch-ai-do
    npx wrangler dev
    ```

2.  **Start the Frontend App**
    * In your second terminal, navigate to the frontend project directory, install its dependencies, and start the Vite dev server.
    ```bash
    cd branch-ai
    npm install
    npm run dev
    ```
    The `vite.config.ts` file is configured to proxy all API and WebSocket requests from the frontend server to the backend server running on port 8788.

3.  **Open in Browser**
    * Once both servers are running, you can access the application at the URL provided by the Vite server (usually `http://localhost:5173`).