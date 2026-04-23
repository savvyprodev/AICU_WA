import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, MessageSquare, Zap } from "lucide-react";
import ErrorAlert from "@/components/ErrorAlert";

export default function Home() {
  const { user } = useAuth();
  const { data: stats, isLoading, error, refetch } = trpc.chats.stats.useQuery();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Welcome back, {user?.name || "User"}!</h1>
          <p className="text-muted-foreground">Here's an overview of your AI chat conversations</p>
        </div>

        {/* Error Alert */}
        {error && (
          <ErrorAlert
            title="Failed to load stats"
            message="There was an error loading your dashboard statistics. Please try again."
            onRetry={() => refetch()}
            onDismiss={() => {}}
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Chats Card */}
          <Card className="p-6 border-l-4 border-l-primary">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Chats</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-primary">{stats?.totalChats || 0}</p>
                )}
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          {/* Total Messages Card */}
          <Card className="p-6 border-l-4 border-l-secondary">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Messages</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-secondary">{stats?.totalMessages || 0}</p>
                )}
              </div>
              <div className="p-3 bg-secondary/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </Card>

          {/* Active AI Tools Card */}
          <Card className="p-6 border-l-4 border-l-accent">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Active AI Tools</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-accent">{stats?.aiTools?.length || 0}</p>
                )}
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Zap className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-primary mb-4">Recent Activity</h2>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No recent chats yet. Start by importing or creating a new chat.</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
