import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import ErrorAlert from "@/components/ErrorAlert";

const AI_TOOLS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Grok",
  "Cursor",
  "Lovable",
];

export default function AllChats() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  const { data: chats, isLoading, error, refetch } = trpc.chats.list.useQuery({
    aiTool: selectedTool || undefined,
    searchTerm: searchTerm || undefined,
    limit: itemsPerPage,
    offset: currentPage * itemsPerPage,
  });

  const handleChatClick = (chatId: number) => {
    navigate(`/chat/${chatId}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">All Chats</h1>
          <p className="text-muted-foreground">Browse and manage all your AI conversations</p>
        </div>

        {/* Error Alert */}
        {error && (
          <ErrorAlert
            title="Failed to load chats"
            message="There was an error loading your chats. Please try again."
            onRetry={() => refetch()}
            onDismiss={() => {}}
          />
        )}

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search chats by title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedTool === null ? "default" : "outline"}
                onClick={() => {
                  setSelectedTool(null);
                  setCurrentPage(0);
                }}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                All Tools
              </Button>
              {AI_TOOLS.map((tool) => (
                <Button
                  key={tool}
                  variant={selectedTool === tool ? "default" : "outline"}
                  onClick={() => {
                    setSelectedTool(tool);
                    setCurrentPage(0);
                  }}
                  size="sm"
                >
                  {tool}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Chats List */}
        <div className="space-y-3 mb-6">
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </>
          ) : chats && chats.length > 0 ? (
            chats.map((chat: any) => (
              <Card
                key={chat.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{chat.title}</h3>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                        {chat.aiTool}
                      </span>
                      {chat.accountTag && (
                        <span className="px-2 py-1 bg-secondary/10 text-secondary rounded text-xs font-medium">
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
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No chats found. Try adjusting your filters or search term.</p>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {chats && chats.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {currentPage * itemsPerPage + 1} to{" "}
              {Math.min((currentPage + 1) * itemsPerPage, (chats?.length || 0) + currentPage * itemsPerPage)} chats
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!chats || chats.length < itemsPerPage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
