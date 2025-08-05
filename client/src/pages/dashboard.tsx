import { useEffect } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { ConnectionPanel } from "@/components/connection-panel";
import { CampaignForm } from "@/components/campaign-form";
import { CampaignProgress } from "@/components/campaign-progress";
import { ActivityLog } from "@/components/activity-log";
import { StatsGrid } from "@/components/stats-grid";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";

export default function Dashboard() {
  const { isConnected, whatsappStatus } = useWebSocket();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-whatsapp rounded-lg flex items-center justify-center">
              <MessageSquare className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Campaign Manager</h1>
              <p className="text-sm text-gray-500">WhatsApp Automation</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-2">
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-whatsapp bg-green-50 rounded-lg">
              <i className="fas fa-tachometer-alt mr-3"></i>
              Dashboard
            </a>
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              <i className="fas fa-plug mr-3"></i>
              Conexões
            </a>
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              <i className="fas fa-bullhorn mr-3"></i>
              Campanhas
            </a>
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              <i className="fas fa-address-book mr-3"></i>
              Contatos
            </a>
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              <i className="fas fa-chart-bar mr-3"></i>
              Relatórios
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-600 mt-1">Gerencie suas campanhas do WhatsApp</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  whatsappStatus?.isConnected 
                    ? 'bg-green-50' 
                    : 'bg-red-50'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    whatsappStatus?.isConnected 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-red-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    whatsappStatus?.isConnected 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {whatsappStatus?.isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <Button className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Campanha
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="p-6 overflow-y-auto">
          {/* Statistics Cards */}
          <StatsGrid stats={stats} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* WhatsApp Connection Panel */}
            <div className="lg:col-span-1">
              <ConnectionPanel />
            </div>

            {/* Campaign Management */}
            <div className="lg:col-span-2">
              <CampaignForm />
            </div>
          </div>

          {/* Active Campaigns and Progress */}
          <div className="mt-8">
            <CampaignProgress />
          </div>

          {/* Recent Activity Log */}
          <div className="mt-8">
            <ActivityLog />
          </div>
        </main>
      </div>
    </div>
  );
}
