// @ts-nocheck

import type { RequestHandler } from './$types';

const handleRequest: RequestHandler = async ({ request, platform }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    // In SvelteKit adapter, bindings are on platform.env
    const env = platform.env;

    // Handles creating a new branch
    if (path === "/api/branch" && request.method === "POST") {
        const { sourceBranchId } = await request.json();
        const sourceStub = env.CONVERSATION_BRANCH.get(
            env.CONVERSATION_BRANCH.idFromName(sourceBranchId)
        );
        const historyResponse = await sourceStub.fetch(new Request(url, { method: "GET" }));
        const history = await historyResponse.json();
        const newBranchId = crypto.randomUUID();
        const newStub = env.CONVERSATION_BRANCH.get(
            env.CONVERSATION_BRANCH.idFromName(newBranchId)
        );
        await newStub.fetch(new Request(url, {
            method: "POST",
            body: JSON.stringify(history),
            headers: { "Content-Type": "application/json" },
        }));
        return new Response(JSON.stringify({ newBranchId }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // Handles WebSocket connections and history fetching for a specific chat
    if (path.startsWith("/api/chat/")) {
        const branchId = path.split("/").pop();
        if (branchId) {
            const durableObjectId = env.CONVERSATION_BRANCH.idFromName(branchId);
            const stub = env.CONVERSATION_BRANCH.get(durableObjectId);
            // The SvelteKit adapter correctly handles the Request types, so we don't need workarounds
            return stub.fetch(request);
        }
    }

    return new Response("Not Found", { status: 404 });
};

// Export a handler for every possible method to create a catch-all route
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
export const PATCH = handleRequest;