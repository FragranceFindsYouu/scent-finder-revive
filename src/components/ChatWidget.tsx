import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage, type FileUIPart } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  usePromptInputAttachments,
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

function AttachmentBar() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-2">
      {attachments.files.map((f) => {
        const isImage = f.mediaType?.startsWith("image/");
        return (
          <div
            key={f.id}
            className="group relative flex items-center gap-2 rounded-md border border-border bg-muted/40 py-1 pl-1 pr-6 text-xs"
          >
            {isImage && f.url ? (
              <img
                src={f.url}
                alt={f.filename ?? "attachment"}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <span className="rounded bg-background px-1.5 py-1 text-[10px] uppercase tracking-wide">
                {f.mediaType?.split("/")[1] ?? "file"}
              </span>
            )}
            <span className="max-w-[140px] truncate text-foreground">
              {f.filename ?? "attachment"}
            </span>
            <button
              type="button"
              onClick={() => attachments.remove(f.id)}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground opacity-70 hover:bg-background hover:opacity-100"
              aria-label="Remove attachment"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AttachButton() {
  const attachments = usePromptInputAttachments();
  return (
    <button
      type="button"
      onClick={() => attachments.openFileDialog()}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Attach files or photos"
      title="Attach files or photos"
    >
      <Paperclip className="h-4 w-4" />
    </button>
  );
}

export function ChatWidget({
  id,
  system,
  placeholder = "Ask me anything…",
  emptyTitle = "How can I help?",
  emptyDescription,
  className,
}: ChatWidgetProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { system },
        headers: (async (): Promise<Record<string, string>> => {
          if (system !== "admin") return {};
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        }) as unknown as Record<string, string>,
      }),
    [system],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id,
    transport,
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    const files = (message.files ?? []) as FileUIPart[];
    if (!text && files.length === 0) return;
    void sendMessage({ text: text || "", files });
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
              const fileParts = m.parts.filter((p) => p.type === "file") as Array<{
                type: "file";
                url?: string;
                mediaType?: string;
                filename?: string;
              }>;
              return (
                <Message from={m.role} key={m.id}>
                  <div className="space-y-2">
                    {fileParts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {fileParts.map((p, i) =>
                          p.mediaType?.startsWith("image/") && p.url ? (
                            <img
                              key={i}
                              src={p.url}
                              alt={p.filename ?? "attachment"}
                              className="max-h-40 rounded-md border border-border"
                            />
                          ) : (
                            <span
                              key={i}
                              className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
                            >
                              {p.filename ?? p.mediaType ?? "file"}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                    {text &&
                      (m.role === "assistant" ? (
                        <MessageResponse>{text}</MessageResponse>
                      ) : (
                        <MessageContent>{text}</MessageContent>
                      ))}
                  </div>
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
        <PromptInput
          onSubmit={handleSubmit}
          accept="image/*,application/pdf,text/*,audio/*,video/*"
          multiple
        >
          <AttachmentBar />
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={placeholder}
            autoFocus
          />
          <PromptInputFooter className="justify-between">
            <AttachButton />
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
