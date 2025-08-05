import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, MessageSquare, CheckCircle, Users } from "lucide-react";

interface Stats {
  activeCampaigns: number;
  messagesSent: number;
  deliveryRate: string;
  contactsImported: number;
}

interface StatsGridProps {
  stats?: Stats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const defaultStats = {
    activeCampaigns: 0,
    messagesSent: 0,
    deliveryRate: "0.0",
    contactsImported: 0,
  };

  const currentStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Campanhas Ativas</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {currentStats.activeCampaigns}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-blue-600 text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↗ Ativo</span>
            <span className="text-gray-600 ml-2">campanhas em execução</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensagens Enviadas</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {currentStats.messagesSent.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="text-green-600 text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↗ Total</span>
            <span className="text-gray-600 ml-2">mensagens processadas</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Entrega</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {currentStats.deliveryRate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-yellow-600 text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↗ Sucesso</span>
            <span className="text-gray-600 ml-2">na entrega</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contatos Importados</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {currentStats.contactsImported.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600 text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">↗ Disponível</span>
            <span className="text-gray-600 ml-2">para campanhas</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
