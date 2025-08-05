import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Activity } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ActivityLogEntry {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: any;
}

export function ActivityLog() {
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/activity-logs"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const clearLogMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/activity-logs"),
    onSuccess: () => {
      toast({
        title: "Log Limpo",
        description: "Log de atividades foi limpo com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message_sent':
        return 'bg-green-500';
      case 'message_delivered':
        return 'bg-blue-500';
      case 'message_failed':
        return 'bg-red-500';
      case 'campaign_started':
        return 'bg-green-500';
      case 'campaign_paused':
        return 'bg-yellow-500';
      case 'campaign_stopped':
        return 'bg-red-500';
      case 'campaign_completed':
        return 'bg-blue-500';
      case 'file_processed':
        return 'bg-blue-500';
      case 'connection':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `há ${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `há ${diffInDays}d`;
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
            <Activity className="w-5 h-5 mr-2" />
            Log de Atividades
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearLogMutation.mutate()}
            disabled={clearLogMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Limpar Log
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-64">
          {isLoading ? (
            <p className="text-gray-500">Carregando atividades...</p>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getActivityIcon(log.type)}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 break-words">{log.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
