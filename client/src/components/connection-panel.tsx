import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Power, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ConnectionPanel() {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/connect"),
    onSuccess: () => {
      toast({
        title: "Conexão Iniciada",
        description: "Processo de conexão com WhatsApp iniciado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/disconnect"),
    onSuccess: () => {
      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Desconectar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] }),
    onSuccess: () => {
      toast({
        title: "Status Atualizado",
        description: "Status da conexão foi atualizado",
      });
    },
  });

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return "Nunca";
    
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffInMinutes = Math.floor((now.getTime() - activity.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `há ${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours}h ${diffInMinutes % 60}min`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `há ${diffInDays}d`;
  };

  return (
    <Card className="h-fit">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <MessageSquare className="text-whatsapp mr-2" />
          Conexão WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Connection Status */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {status?.isConnected ? (
              <Wifi className="text-whatsapp text-3xl" />
            ) : (
              <WifiOff className="text-gray-400 text-3xl" />
            )}
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              status?.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <Badge variant={status?.isConnected ? "default" : "destructive"}>
              {status?.isConnected ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            {status?.session?.lastActivity 
              ? `Conectado ${formatLastActivity(status.session.lastActivity)}`
              : 'Não conectado'
            }
          </p>
        </div>

        {/* Session Info */}
        {status?.session && (
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sessão:</span>
              <span className="text-sm font-medium text-gray-900">
                {status.session.sessionName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Dispositivo:</span>
              <span className="text-sm font-medium text-gray-900">
                {status.deviceName || 'Chrome Desktop'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant={status.session.status === 'connected' ? 'default' : 'secondary'}>
                {status.session.status === 'connected' ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
          </div>
        )}

        {/* Connection Actions */}
        <div className="space-y-3">
          {status?.isConnected ? (
            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              <Power className="w-4 h-4 mr-2" />
              {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar'}
            </Button>
          ) : (
            <Button
              className="w-full bg-whatsapp hover:bg-whatsapp-dark text-white"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              <Power className="w-4 h-4 mr-2" />
              {connectMutation.isPending ? 'Conectando...' : 'Conectar'}
            </Button>
          )}
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending || isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
