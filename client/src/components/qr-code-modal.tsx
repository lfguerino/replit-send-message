import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Smartphone, RefreshCw, X } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeData?: string;
  connectionStatus?: string;
}

export function QRCodeModal({ isOpen, onClose, qrCodeData, connectionStatus }: QRCodeModalProps) {
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutos
  const { whatsappStatus } = useWebSocket();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    // Reset timer when new QR code is received
    if (qrCodeData) {
      setTimeLeft(120);
    }
  }, [qrCodeData]);

  // Close modal if connection is successful
  useEffect(() => {
    if (whatsappStatus?.isConnected) {
      onClose();
    }
  }, [whatsappStatus?.isConnected, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connecting':
        return 'bg-blue-100 text-blue-700';
      case 'qrReadSuccess':
        return 'bg-green-100 text-green-700';
      case 'authenticated':
        return 'bg-green-100 text-green-700';
      case 'qrReadError':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connecting':
        return 'Conectando...';
      case 'qrReadSuccess':
        return 'QR Code lido com sucesso!';
      case 'authenticated':
        return 'Autenticado com sucesso!';
      case 'qrReadError':
        return 'Erro na leitura do QR Code';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Aguardando conexão';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <QrCode className="text-whatsapp" />
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </div>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          {connectionStatus && (
            <div className="flex justify-center">
              <Badge className={getStatusColor(connectionStatus)}>
                {getStatusText(connectionStatus)}
              </Badge>
            </div>
          )}

          {/* QR Code Display */}
          <Card>
            <CardContent className="p-6">
              {qrCodeData ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <img 
                        src={qrCodeData} 
                        alt="QR Code WhatsApp" 
                        className="w-64 h-64 border-2 border-gray-200 rounded-lg"
                      />
                      {timeLeft <= 0 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <div className="text-white text-center">
                            <RefreshCw className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">QR Code expirado</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Timer */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      QR Code expira em: <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div 
                        className="bg-whatsapp h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${(timeLeft / 120) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <QrCode className="w-16 h-16 mb-4" />
                  <p className="text-center">
                    {connectionStatus === 'connecting' 
                      ? 'Gerando QR Code...' 
                      : 'Clique em "Conectar" para gerar o QR Code'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Como conectar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em Mais opções (⋮) → Dispositivos conectados</li>
                    <li>Toque em "Conectar dispositivo"</li>
                    <li>Aponte a câmera para este QR Code</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            {timeLeft <= 0 && (
              <Button
                className="flex-1 bg-whatsapp hover:bg-whatsapp-dark text-white"
                onClick={() => {
                  setTimeLeft(120);
                  // Trigger new QR code generation
                  window.location.reload();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Novo QR Code
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}