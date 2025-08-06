import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface WebhookLog {
  id: string;
  endpoint: string;
  method: string;
  requestBody: any;
  headers: any;
  ipAddress: string | null;
  userAgent: string | null;
  statusCode: number;
  responseTime: number | null;
  createdAt: string;
}

export function WebhookLogs() {
  const { toast } = useToast();
  
  const { data: logs, isLoading, error } = useQuery<WebhookLog[]>({
    queryKey: ['/api/webhook-logs'],
    refetchInterval: 5000,
  });

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
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const formatEndpoint = (endpoint: string) => {
    if (endpoint.includes('contact_finished')) return 'Contato Finalizado';
    if (endpoint.includes('email_sent')) return 'Email Enviado';
    return endpoint;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Carregando logs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <ExternalLink className="w-12 h-12 mx-auto mb-2 opacity-50 text-red-500" />
          <p className="text-red-600">Erro ao carregar logs</p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/webhook-logs'] })}
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const logsArray = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Webhook Logs</h2>
          <p className="text-gray-600 mt-1">
            Monitore requisições recebidas nos endpoints de webhook
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logsArray.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {logsArray.filter(log => log.statusCode >= 200 && log.statusCode < 300).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contatos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {logsArray.filter(log => log.endpoint.includes('contact_finished')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {logsArray.filter(log => log.endpoint.includes('email_sent')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Requisições</CardTitle>
        </CardHeader>
        <CardContent>
          {!logsArray.length ? (
            <div className="text-center py-8 text-gray-500">
              <ExternalLink className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma requisição de webhook foi recebida ainda.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {logsArray.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${
                        log.statusCode >= 200 && log.statusCode < 300 ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {log.statusCode}
                      </span>
                      <span className="text-sm font-medium">{formatEndpoint(log.endpoint)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(log.createdAt)}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    IP: {log.ipAddress || 'N/A'} | 
                    Tempo: {log.responseTime || 0}ms
                  </div>

                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-700 mb-1">Request Body:</div>
                    <div className="bg-gray-100 rounded p-2 max-h-24 overflow-auto">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {typeof log.requestBody === 'string' 
                          ? log.requestBody 
                          : JSON.stringify(log.requestBody, null, 2)
                        }
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}