import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import { Upload, FileJson, FileText, Plus } from "lucide-react";

const AI_TOOLS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Grok",
  "Cursor",
  "Lovable",
];

export default function Import() {
  const createChat = trpc.chats.create.useMutation();
  const [isImporting, setIsImporting] = useState(false);

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    title: "",
    aiTool: "ChatGPT",
    accountTag: "",
    conversation: "",
  });

  const handleJsonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Handle both single chat and array of chats
      const chats = Array.isArray(data) ? data : [data];

      for (const chat of chats) {
        await createChat.mutateAsync({
          title: chat.title || "Imported Chat",
          aiTool: chat.aiTool || "ChatGPT",
          accountTag: chat.accountTag,
          fullConversation: chat.fullConversation || chat.messages || [],
          messageCount: (chat.fullConversation || chat.messages || []).length,
          tags: chat.tags,
        });
      }

      toast.success(`Successfully imported ${chats.length} chat(s)`);
      event.target.value = "";
    } catch (error) {
      toast.error("Failed to import JSON file. Please check the format.");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleMarkdownUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n");

      // Extract title from first heading
      let title = "Imported Chat";
      let aiTool = "ChatGPT";
      const messages: any[] = [];

      let currentMessage: any = null;

      for (const line of lines) {
        if (line.startsWith("# ")) {
          title = line.replace("# ", "").trim();
        } else if (line.startsWith("## ")) {
          if (currentMessage) {
            messages.push(currentMessage);
          }
          const header = line.replace("## ", "").trim();
          currentMessage = {
            role: header.includes("User") ? "user" : "assistant",
            content: "",
          };
        } else if (currentMessage && line.trim()) {
          currentMessage.content += (currentMessage.content ? "\n" : "") + line;
        }
      }

      if (currentMessage) {
        messages.push(currentMessage);
      }

      await createChat.mutateAsync({
        title,
        aiTool,
        fullConversation: messages,
        messageCount: messages.length,
      });

      toast.success("Successfully imported Markdown chat");
      event.target.value = "";
    } catch (error) {
      toast.error("Failed to import Markdown file. Please check the format.");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualForm.title.trim()) {
      toast.error("Please enter a chat title");
      return;
    }

    if (!manualForm.conversation.trim()) {
      toast.error("Please enter the conversation content");
      return;
    }

    setIsImporting(true);
    try {
      // Parse conversation as simple user/assistant alternating messages
      const lines = manualForm.conversation
        .split("\n\n")
        .filter((l) => l.trim());
      const messages = lines.map((line, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: line.trim(),
      }));

      await createChat.mutateAsync({
        title: manualForm.title,
        aiTool: manualForm.aiTool,
        accountTag: manualForm.accountTag || undefined,
        fullConversation: messages,
        messageCount: messages.length,
      });

      toast.success("Chat created successfully!");
      setManualForm({
        title: "",
        aiTool: "ChatGPT",
        accountTag: "",
        conversation: "",
      });
    } catch (error) {
      toast.error("Failed to create chat");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Import Chats</h1>
          <p className="text-muted-foreground">
            Import your AI conversations from files or create them manually
          </p>
        </div>

        <Tabs defaultValue="json" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="markdown" className="gap-2">
              <FileText className="w-4 h-4" />
              Markdown
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Plus className="w-4 h-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* JSON Upload */}
          <TabsContent value="json" className="mt-6">
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <FileJson className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-2">Upload JSON File</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload a JSON file containing chat conversations. Supports both single chat
                    objects and arrays of chats.
                  </p>
                </div>
                <label className="w-full">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                    disabled={isImporting}
                    className="hidden"
                  />
                  <Button
                    asChild
                    disabled={isImporting}
                    className="gap-2 cursor-pointer"
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      {isImporting ? "Importing..." : "Choose JSON File"}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground text-center">
                  Expected format: {`{ "title": "...", "aiTool": "...", "fullConversation": [...] }`}
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Markdown Upload */}
          <TabsContent value="markdown" className="mt-6">
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <FileText className="w-8 h-8 text-secondary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-2">Upload Markdown File</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload a Markdown file with your conversation. Use ## User and ## AI sections
                    to separate messages.
                  </p>
                </div>
                <label className="w-full">
                  <input
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleMarkdownUpload}
                    disabled={isImporting}
                    className="hidden"
                  />
                  <Button
                    asChild
                    disabled={isImporting}
                    className="gap-2 cursor-pointer"
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      {isImporting ? "Importing..." : "Choose Markdown File"}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground text-center">
                  Expected format: Use ## User and ## AI sections to separate messages
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Manual Entry */}
          <TabsContent value="manual" className="mt-6">
            <Card className="p-6">
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium">
                      Chat Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Conversation with Claude about AI"
                      value={manualForm.title}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, title: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="aiTool" className="text-sm font-medium">
                      AI Tool
                    </Label>
                    <select
                      id="aiTool"
                      value={manualForm.aiTool}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, aiTool: e.target.value })
                      }
                      className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      {AI_TOOLS.map((tool) => (
                        <option key={tool} value={tool}>
                          {tool}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="accountTag" className="text-sm font-medium">
                    Account Tag (Optional)
                  </Label>
                  <Input
                    id="accountTag"
                    placeholder="e.g., Personal, Work"
                    value={manualForm.accountTag}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, accountTag: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="conversation" className="text-sm font-medium">
                    Conversation *
                  </Label>
                  <Textarea
                    id="conversation"
                    placeholder="Paste your conversation here. Separate user and AI messages with blank lines."
                    value={manualForm.conversation}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, conversation: e.target.value })
                    }
                    className="mt-1 min-h-64"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Messages will alternate between user and AI. Separate each message with a blank
                    line.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isImporting}
                  className="bg-primary hover:bg-primary/90 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isImporting ? "Creating..." : "Create Chat"}
                </Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
