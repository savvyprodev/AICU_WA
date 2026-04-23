import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Bell, Shield } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  const handleSaveProfile = () => {
    toast.success("Profile settings saved successfully!");
  };

  const handleSavePreferences = () => {
    toast.success("Preferences saved successfully!");
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Settings */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-primary">Profile Information</h2>
          </div>
          <Separator className="mb-6" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                defaultValue={user?.name || ""}
                className="mt-1"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your name from your account profile
              </p>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue={user?.email || ""}
                className="mt-1"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your email address cannot be changed
              </p>
            </div>

            <Button
              onClick={handleSaveProfile}
              className="bg-primary hover:bg-primary/90"
            >
              Save Profile
            </Button>
          </div>
        </Card>

        {/* Display Preferences */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-bold text-secondary">Display Preferences</h2>
          </div>
          <Separator className="mb-6" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="itemsPerPage" className="text-sm font-medium">
                Items Per Page
              </Label>
              <select
                id="itemsPerPage"
                defaultValue="20"
                className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="10">10 items</option>
                <option value="20">20 items</option>
                <option value="50">50 items</option>
                <option value="100">100 items</option>
              </select>
            </div>

            <div>
              <Label htmlFor="theme" className="text-sm font-medium">
                Theme
              </Label>
              <select
                id="theme"
                defaultValue="light"
                className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <Button
              onClick={handleSavePreferences}
              className="bg-secondary hover:bg-secondary/90"
            >
              Save Preferences
            </Button>
          </div>
        </Card>

        {/* AI Tool Connections */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-accent">AI Tool Connections</h2>
          </div>
          <Separator className="mb-6" />

          <div className="space-y-3">
            {[
              { name: "ChatGPT", status: "connected" },
              { name: "Claude", status: "not_connected" },
              { name: "Gemini", status: "not_connected" },
              { name: "Grok", status: "not_connected" },
            ].map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{tool.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {tool.status === "connected" ? "✓ Connected" : "Not connected"}
                  </p>
                </div>
                <Button
                  variant={tool.status === "connected" ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    toast.info(
                      `${tool.status === "connected" ? "Disconnected" : "Connected"} ${tool.name}`
                    );
                  }}
                >
                  {tool.status === "connected" ? "Disconnect" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Management */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-primary mb-6">Data Management</h2>
          <Separator className="mb-6" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all your data or delete your account permanently
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  toast.success("Exporting your data...");
                }}
              >
                Export All Data
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure? This action cannot be undone."
                    )
                  ) {
                    toast.error("Account deletion initiated");
                  }
                }}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
