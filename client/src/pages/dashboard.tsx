import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { ConnectionPanel } from "@/components/connection-panel";
import { CampaignForm } from "@/components/campaign-form";
import { CampaignProgress } from "@/components/campaign-progress";
import { ActivityLog } from "@/components/activity-log";
import { StatsGrid } from "@/components/stats-grid";
import { ContactsTable } from "@/components/contacts-table";
import { UserProfile } from "@/components/user-profile";
import { WebhookLogs } from "@/pages/webhook-logs-simple";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageSquare, Plus, Home, Plug, Megaphone, Users, BarChart, LogOut, User, Settings, Webhook } from "lucide-react";

export default function Dashboard() {
  const { isConnected, whatsappStatus } = useWebSocket();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');

  const { data: stats } = useQuery<{
    activeCampaigns: number;
    messagesSent: number;
    deliveryRate: string;
    contactsImported: number;
  }>({
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
            <button 
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'dashboard' 
                  ? 'text-whatsapp bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="button-nav-dashboard"
            >
              <Home className="w-4 h-4 mr-3" />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveSection('connections')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'connections' 
                  ? 'text-whatsapp bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="button-nav-connections"
            >
              <Plug className="w-4 h-4 mr-3" />
              Conexões
            </button>
            <button 
              onClick={() => setActiveSection('campaigns')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'campaigns' 
                  ? 'text-whatsapp bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="button-nav-campaigns"
            >
              <Megaphone className="w-4 h-4 mr-3" />
              Campanhas
            </button>
            <button 
              onClick={() => setActiveSection('contacts')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'contacts' 
                  ? 'text-whatsapp bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="button-nav-contacts"
            >
              <Users className="w-4 h-4 mr-3" />
              Contatos
            </button>
            <button 
              onClick={() => setActiveSection('reports')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'reports' 
                  ? 'text-whatsapp bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="button-nav-reports"
            >
              <BarChart className="w-4 h-4 mr-3" />
              Relatórios
            </button>
            <button 
              onClick={() => setActiveSection('webhook-logs')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'webhook-logs' 
                  ? 'text-whatsapp bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="button-nav-webhooks"
            >
              <Webhook className="w-4 h-4 mr-3" />
              Webhook Logs
            </button>
            <button 
              onClick={() => setActiveSection('profile')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'profile' 
                  ? 'text-whatsapp bg-green-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="button-nav-profile"
            >
              <Settings className="w-4 h-4 mr-3" />
              Perfil
            </button>
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
                <h2 className="text-2xl font-semibold text-gray-900">
                  {activeSection === 'dashboard' && 'Dashboard'}
                  {activeSection === 'connections' && 'Conexões WhatsApp'}
                  {activeSection === 'campaigns' && 'Campanhas'}
                  {activeSection === 'contacts' && 'Contatos'}
                  {activeSection === 'reports' && 'Relatórios'}
                  {activeSection === 'webhook-logs' && 'Webhook Logs'}
                  {activeSection === 'profile' && 'Perfil do Usuário'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {activeSection === 'dashboard' && 'Gerencie suas campanhas do WhatsApp'}
                  {activeSection === 'connections' && 'Configure e monitore conexões do WhatsApp'}
                  {activeSection === 'campaigns' && 'Crie e gerencie campanhas de mensagens'}
                  {activeSection === 'contacts' && 'Visualize todos os contatos importados'}
                  {activeSection === 'reports' && 'Estatísticas e relatórios de atividade'}
                  {activeSection === 'profile' && 'Altere suas informações pessoais e senha'}
                </p>
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
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{user?.username || 'Usuário'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setActiveSection('profile')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
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
          {activeSection === 'dashboard' && (
            <>
              {/* Statistics Cards */}
              <StatsGrid stats={stats} />

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 gap-6 mt-8">
                {/* Campaign Management */}
                <div>
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
            </>
          )}

          {activeSection === 'connections' && (
            <div className="space-y-6">
              <ConnectionPanel />
            </div>
          )}

          {activeSection === 'campaigns' && (
            <div className="space-y-6">
              <CampaignForm />
              <CampaignProgress />
            </div>
          )}

          {activeSection === 'contacts' && (
            <div className="space-y-6">
              <ContactsTable />
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="space-y-6">
              <StatsGrid stats={stats} />
              <ActivityLog />
            </div>
          )}

          {activeSection === 'webhook-logs' && (
            <div className="space-y-6">
              <WebhookLogs />
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="space-y-6">
              <UserProfile />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
