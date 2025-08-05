import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, MoreHorizontal } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  totalContacts: number;
  contacts: number;
  progress: number;
}

export function CampaignProgress() {
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/active"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const pauseCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => apiRequest("POST", `/api/campaigns/${campaignId}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resumeCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => apiRequest("POST", `/api/campaigns/${campaignId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => apiRequest("POST", `/api/campaigns/${campaignId}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Enviando</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700">Rascunho</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausada</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700">Concluída</Badge>;
      case 'stopped':
        return <Badge variant="destructive">Interrompida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500 animate-pulse';
      case 'draft':
        return 'bg-gray-400';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'stopped':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-whatsapp';
      case 'draft':
        return 'bg-gray-400';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'stopped':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campanhas em Andamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Carregando campanhas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Campanhas em Andamento
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                campaigns?.forEach(campaign => {
                  if (campaign.status === 'active') {
                    pauseCampaignMutation.mutate(campaign.id);
                  }
                });
              }}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pausar Todas
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                campaigns?.forEach(campaign => {
                  if (campaign.status === 'active' || campaign.status === 'paused') {
                    stopCampaignMutation.mutate(campaign.id);
                  }
                });
              }}
            >
              <Square className="w-4 h-4 mr-1" />
              Parar Todas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!campaigns || campaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma campanha ativa no momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(campaign.status)}`}></div>
                    <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {campaign.status === 'draft' ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => resumeCampaignMutation.mutate(campaign.id)}
                        disabled={resumeCampaignMutation.isPending}
                        data-testid={`button-start-${campaign.id}`}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar Campanha
                      </Button>
                    ) : campaign.status === 'paused' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resumeCampaignMutation.mutate(campaign.id)}
                        disabled={resumeCampaignMutation.isPending}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    ) : campaign.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => pauseCampaignMutation.mutate(campaign.id)}
                        disabled={pauseCampaignMutation.isPending}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : null}
                    
                    {(campaign.status === 'active' || campaign.status === 'paused') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => stopCampaignMutation.mutate(campaign.id)}
                        disabled={stopCampaignMutation.isPending}
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>
                      {campaign.sentCount} de {campaign.totalContacts} enviadas
                    </span>
                    <span>{campaign.progress.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={campaign.progress} 
                    className="h-2"
                  />
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500">Enviadas</p>
                    <p className="font-semibold text-green-600">{campaign.sentCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Entregues</p>
                    <p className="font-semibold text-blue-600">{campaign.deliveredCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Falharam</p>
                    <p className="font-semibold text-red-600">{campaign.failedCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Pendentes</p>
                    <p className="font-semibold text-gray-600">
                      {campaign.totalContacts - campaign.sentCount}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
