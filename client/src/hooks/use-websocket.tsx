import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface WhatsappStatus {
  isConnected: boolean;
  sessionName: string;
  deviceName?: string;
  lastActivity?: Date;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        setTimeout(() => {
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          connect();
        }, 2000 * reconnectAttempts.current);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'whatsapp_connected':
        setWhatsappStatus({
          isConnected: true,
          sessionName: message.data.sessionName,
          deviceName: 'Chrome Desktop',
          lastActivity: new Date()
        });
        toast({
          title: "WhatsApp Conectado",
          description: "Conexão estabelecida com sucesso",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
        break;

      case 'whatsapp_disconnected':
        setWhatsappStatus(prev => prev ? { ...prev, isConnected: false } : null);
        toast({
          title: "WhatsApp Desconectado",
          description: "Conexão perdida",
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
        break;

      case 'qrcode':
        toast({
          title: "QR Code Gerado",
          description: "Escaneie o QR Code no WhatsApp Web",
        });
        break;

      case 'message_sent':
        toast({
          title: "Mensagem Enviada",
          description: `Mensagem enviada para ${message.data.to}`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        break;

      case 'message_error':
        toast({
          title: "Erro no Envio",
          description: `Falha ao enviar mensagem para ${message.data.to}`,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
        break;

      case 'campaign_started':
        toast({
          title: "Campanha Iniciada",
          description: `Campanha "${message.data.name}" foi iniciada`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
        break;

      case 'campaign_paused':
        toast({
          title: "Campanha Pausada",
          description: `Campanha "${message.data.name}" foi pausada`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
        break;

      case 'campaign_stopped':
        toast({
          title: "Campanha Interrompida",
          description: `Campanha "${message.data.name}" foi interrompida`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
        break;

      case 'campaign_completed':
        toast({
          title: "Campanha Concluída",
          description: `Campanha "${message.data.name}" foi concluída`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
        break;

      case 'campaign_progress':
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    whatsappStatus,
  };
}
