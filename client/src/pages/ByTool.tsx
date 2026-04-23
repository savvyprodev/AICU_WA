import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown, ChevronRight } from "lucide-react";
import ErrorAlert from "@/components/ErrorAlert";

export default function ByTool() {
  const [, navigate] = useLocation();
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const { data: chatsByTool, isLoading, error, refetch } = trpc.chats.byTool.useQuery();

  const toggleTool = (tool: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(tool)) {
      newExpanded.delete(tool);
    } else {
      newExpanded.add(tool);
    }
    setExpandedTools(newExpanded);
  };

  const handleChatClick = (chatId: number) => {
    navigate(`/chat/${chatId}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Chats by AI Tool</h1>
          <p className="text-muted-foreground">Browse your conversations organized by AI platform</p>
        </div>

        {/* Error Alert */}
        {error && (
          <ErrorAlert
            title="Failed to load chats"
            message="There was an error loading chats by tool. Please try again."
            onRetry={() => refetch()}
            onDismiss={() => {}}
          />
        )}

        {/* Tools List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 w-1/4 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </Card>
              ))}
            </>
          ) : chatsByTool && Object.keys(chatsByTool).length > 0 ? (
            Object.entries(chatsByTool).map(([tool, chats]: [string, any]) => {
              const isExpanded = expandedTools.has(tool);
              const totalMessages = (chats as any[]).reduce(
                (sum, chat) => sum + (chat.messageCount || 0),
                0
              );

              return (
                <Card key={tool} className="overflow-hidden">
                  <button
                    onClick={() => toggleTool(tool)}
                    className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-foreground">{tool}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(chats as any[]).length} chats • {totalMessages} messages
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                        {(chats as any[]).length}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border bg-background/50 p-4 space-y-3">
                      {(chats as any[]).map((chat) => (
                        <div
                          key={chat.id}
                          className="p-3 bg-card rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                          onClick={() => handleChatClick(chat.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{chat.title}</p>
                              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                {chat.accountTag && (
                                  <span className="px-2 py-1 bg-secondary/10 text-secondary rounded">
                                    {chat.accountTag}
                                  </span>
                                )}
                                <span>{chat.messageCount || 0} messages</span>
                                <span>{new Date(chat.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatClick(chat.id);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No chats found. Start by importing or creating a new chat.</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
