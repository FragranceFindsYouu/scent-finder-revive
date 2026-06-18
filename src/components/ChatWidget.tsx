import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

type ChatWidgetProps = {
  id: string;
  system: "customer" | "admin";
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function ChatWidget({
  id,
  system,
  placeholder = "Ask me anything…",
  emptyTitle = "How can I help?",
  emptyDescription,
  className,
}: ChatWidgetProps) {
  const { messages, sendMessage, status, error, stop } = useChat({
    id,
    transport,
    // Inject which system prompt the server should use
    // by augmenting the request body on each send.
    // (DefaultChatTransport spreads body fields into the POST payload.)
    // @ts-expect-error - body prop is supported by DefaultChatTransport at runtime
    body: { system },
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep the composer focused after mount and after a send.
  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text) return;
    void sendMessage({ text });
  };

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className={`flex h-full flex-col ${className ?? ""}`}>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : (
            (messages as UIMessage[]).map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <Message from={m.role} key={m.id}>
                  {m.role === "assistant" ? (
                    <MessageResponse>{text}</MessageResponse>
                  ) : (
                    <MessageContent>{text}</MessageContent>
                  )}
                </Message>
              );
            })
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <Shimmer>Thinking…</Shimmer>
            </Message>
          )}
          {error && (
            <div className="px-3 py-2 text-xs text-destructive">
              {error.message || "Something went wrong. Please try again."}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={placeholder}
            autoFocus
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={status}
              disabled={isBusy && status !== "streaming"}
              onClick={status === "streaming" ? () => stop() : undefined}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
