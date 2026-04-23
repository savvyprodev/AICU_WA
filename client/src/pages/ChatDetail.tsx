import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { Streamdown } from "streamdown";
import ErrorAlert from "@/components/ErrorAlert";
import { useState } from "react";

interface ChatDetailProps {
  params: {
    id: string;
  };
}

export default function ChatDetail({ params }: ChatDetailProps) {
  const [, navigate] = useLocation();

  const chatId = parseInt(params.id, 10);

  const { data: chat, isLoading, error, refetch } = trpc.chats.byId.useQuery({
    id: chatId,
  });

  const handleExportJSON = () => {
    if (!chat) return;
    const dataStr = JSON.stringify(chat, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chat.title}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    if (!chat) return;
    const conversation = Array.isArray(chat.fullConversation)
      ? chat.fullConversation
      : [];

    let markdown = `# ${chat.title}\n\n`;
    markdown += `**AI Tool:** ${chat.aiTool}\n`;
    if (chat.accountTag) {
      markdown += `**Account:** ${chat.accountTag}\n`;
    }
    markdown += `**Date:** ${new Date(chat.createdAt).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    for (const msg of conversation) {
      const role = (msg as any).role || "unknown";
      const content = (msg as any).content || "";
      markdown += `## ${role === "user" ? "👤 User" : "🤖 AI"}\n\n${content}\n\n`;
    }

    const dataBlob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chat.title}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/chats")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chats
          </Button>
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/chats")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chats
          </Button>
          <ErrorAlert
            title="Failed to load chat"
            message="There was an error loading this chat. Please try again."
            onRetry={() => refetch()}
            onDismiss={() => navigate("/chats")}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (!chat) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/chats")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chats
          </Button>
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Chat not found</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const messages = Array.isArray(chat.fullConversation)
    ? chat.fullConversation
    : [];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/chats")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chats
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMarkdown}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Markdown
            </Button>
          </div>
        </div>

        {/* Chat Header */}
        <Card className="p-6 mb-6 border-l-4 border-l-primary">
          <h1 className="text-2xl font-bold text-primary mb-3">{chat.title}</h1>
          <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
              {chat.aiTool}
            </span>
            {chat.accountTag && (
              <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full font-medium">
                {chat.accountTag}
              </span>
            )}
            <span>{messages.length} messages</span>
            <span>{new Date(chat.createdAt).toLocaleString()}</span>
          </div>
        </Card>

        {/* Conversation Thread */}
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((msg: any, index: number) => {
              const isUser = msg.role === "user";
              return (
                <Card
                  key={index}
                  className={`p-4 ${
                    isUser
                      ? "bg-primary/5 border-l-4 border-l-primary"
                      : "bg-secondary/5 border-l-4 border-l-secondary"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {isUser ? "👤" : "🤖"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-2">
                        {isUser ? "You" : "AI Assistant"}
                      </p>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Streamdown>{msg.content || ""}</Streamdown>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No messages in this conversation</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
