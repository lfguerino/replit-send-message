import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, ExternalLink, Clock, Globe, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface WebhookLog {
  id: string;
  endpoint: string;
  method: string;
  requestBody: string;
  headers: any;
  ipAddress: string | null;
  userAgent: string | null;
  statusCode: number;
  responseTime: number | null;
  createdAt: string;
}

export function WebhookLogs() {
  const { toast } = useToast();
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  
  const { data: logs = [], isLoading, error } = useQuery<WebhookLog[]>({
    queryKey: ['/api/webhook-logs'],
    refetchInterval: realTimeUpdates ? 5000 : false,
  });

  console.log('Webhook logs data:', logs, 'Loading:', isLoading, 'Error:', error);

  // Ensure logs is always an array
  const logsArray = Array.isArray(logs) ? logs : [];

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/webhook-logs', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to clear logs');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/webhook-logs'] });
      toast({
        title: "Logs Limpos",
        description: "Todos os logs de webhook foram removidos",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao Limpar Logs",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatEndpoint = (endpoint: string) => {
    if (endpoint.includes('contact_finished')) return 'Contato Finalizado';
    if (endpoint.includes('email_sent')) return 'Email Enviado';
    return endpoint;
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'bg-green-500';
    if (statusCode >= 400 && statusCode < 500) return 'bg-yellow-500';
    if (statusCode >= 500) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const prettyPrintJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Carregando logs...</span>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ExternalLink className="w-12 h-12 mx-auto mb-2 opacity-50 text-red-500" />
            <p className="text-red-600">Erro ao carregar logs: {error.message}</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/webhook-logs'] })}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de Webhook</h1>
          <p className="text-gray-600 mt-1">
            Monitore todas as requisições recebidas nos endpoints de webhook
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/webhook-logs'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            variant="destructive" 
            onClick={clearLogs}
            disabled={!logsArray.length}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logsArray.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requisições Bem-sucedidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {logsArray.filter(log => log.statusCode >= 200 && log.statusCode < 300).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contatos Finalizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {logsArray.filter(log => log.endpoint.includes('contact_finished')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emails Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {logsArray.filter(log => log.endpoint.includes('email_sent')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Requisições</CardTitle>
          <CardDescription>
            Logs em tempo real das requisições recebidas nos endpoints de webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!logsArray.length ? (
            <div className="text-center py-8 text-gray-500">
              <ExternalLink className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma requisição de webhook foi recebida ainda.</p>
              <p className="text-sm mt-1">
                As requisições aparecerão aqui automaticamente quando recebermos webhooks.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {logsArray.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getStatusColor(log.statusCode)} text-white`}>
                          {log.statusCode}
                        </Badge>
                        <Badge variant="outline">
                          {formatEndpoint(log.endpoint)}
                        </Badge>
                        <span className="text-sm font-mono text-gray-600">
                          {log.method}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {log.responseTime && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {log.responseTime}ms
                          </div>
                        )}
                        <div className="flex items-center">
                          <Globe className="w-3 h-3 mr-1" />
                          {log.ipAddress || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTimestamp(log.createdAt)}
                    </div>

                    {log.userAgent && (
                      <div className="text-xs text-gray-500 mb-2 flex items-center">
                        <Smartphone className="w-3 h-3 mr-1" />
                        {log.userAgent}
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Request Body:</div>
                      <div className="bg-gray-100 rounded p-2 max-h-32 overflow-auto">
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                          {prettyPrintJSON(log.requestBody)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}