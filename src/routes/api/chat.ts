import { createFileRoute } from "@tanstack/react-router";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = {
  messages?: unknown;
  system?: unknown;
};

const CUSTOMER_SYSTEM = `You are the friendly customer concierge for Fragrance Finds You (FFY), a luxury fragrance boutique. Help shoppers discover scents, explain notes (top, heart, base), suggest pairings for moods or seasons, and answer questions about orders, shipping, and returns in a warm, concise tone. If you don't know something specific about an order, tell the customer to contact support via the Contact page.`;

const ADMIN_SYSTEM = `You are the admin copilot for the Fragrance Finds You (FFY) operator dashboard. Help the store owner with: writing product descriptions and SEO copy, drafting marketing emails, summarizing orders, suggesting pricing/promotions, debugging admin workflows, and analyzing customer feedback. Be direct, structured, and use markdown lists/tables when useful.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const { messages, system } = body;
        if (!Array.isArray(messages)) {
          return new Response("`messages` must be an array of UIMessage", { status: 400 });
        }

        const systemPrompt =
          system === "admin"
            ? ADMIN_SYSTEM
            : system === "customer"
              ? CUSTOMER_SYSTEM
              : CUSTOMER_SYSTEM;

        try {
          const google = createGoogleGenerativeAI({ apiKey });
          const result = streamText({
            model: google("gemini-2.5-flash"),
            system: systemPrompt,
            messages: convertToModelMessages(messages as UIMessage[]),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (err) {
          console.error("[api/chat] streamText failed", err);
          return new Response(
            JSON.stringify({
              error: "Chat service is temporarily unavailable. Please try again.",
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
