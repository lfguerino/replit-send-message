import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, X, Play, Save, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1, "Nome da campanha é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  messageInterval: z.number(),
  scheduleType: z.string(),
  scheduledAt: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export function CampaignForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileStats, setFileStats] = useState<{ contacts: number; size: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      message: "",
      messageInterval: 3,
      scheduleType: "now",
    },
  });

  const createCampaignMutation = useMutation({  
    mutationFn: async (data: CampaignFormData & { file?: File; status?: string }) => {

      console.log("Botão clicado para criar a campanha 🚀");
      
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('message', data.message);
      formData.append('messageInterval', data.messageInterval.toString());
      formData.append('scheduleType', data.scheduleType);
      formData.append('status', data.status || 'draft');
      

      if (data.scheduledAt) {
        formData.append('scheduledAt', data.scheduledAt);
      }
      
      if (data.file) {
        formData.append('contactsFile', data.file);
      }

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar campanha');
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      const isDraft = variables.status === 'draft';
      toast({
        title: isDraft ? "Rascunho Salvo" : "Campanha Criada",
        description: `${isDraft ? 'Rascunho salvo' : 'Campanha criada'} com ${result.contactsImported} contatos importados`,
      });
      form.reset();
      setSelectedFile(null);
      setFileStats(null);
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Criar Campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de Arquivo Inválido",
          description: "Use apenas arquivos Excel (.xlsx ou .xls)",
          variant: "destructive",
        });
        return;
      }

      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo Muito Grande",
          description: "Tamanho máximo: 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setFileStats({
        contacts: 0, // We can't know without processing
        size: `${(file.size / 1024).toFixed(0)}KB`
      });
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileStats(null);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmit = (data: CampaignFormData) => {
    console.log("Botão clicado para criar a campanha 🚀");
    createCampaignMutation.mutate({
      ...data,
      file: selectedFile || undefined,
      status: 'active',
    });
  };

  const onSaveDraft = () => {
    const data = form.getValues();
    console.log("Salvando rascunho da campanha 📝");
    createCampaignMutation.mutate({
      ...data,
      file: selectedFile || undefined,
      status: 'draft',
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Criar Nova Campanha
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Avançado
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Campaign Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Campanha</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Promoção Black Friday 2024" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message Content */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Digite sua mensagem aqui..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Você pode usar variáveis: {"{nome}"}, {"{telefone}"}, {"{empresa}"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div>
              <FormLabel>Lista de Contatos (Excel)</FormLabel>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <FileSpreadsheet className="w-12 h-12" />
                  </div>
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-whatsapp hover:text-whatsapp-dark">
                      <span>Enviar arquivo</span>
                      <input 
                        type="file" 
                        className="sr-only" 
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">Arquivos Excel até 10MB</p>
                </div>
              </div>
              
              {/* File Preview */}
              {selectedFile && (
                <div className="mt-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fileStats?.size}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Campaign Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="messageInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo entre Mensagens</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o intervalo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 segundo</SelectItem>
                        <SelectItem value="3">3 segundos</SelectItem>
                        <SelectItem value="5">5 segundos</SelectItem>
                        <SelectItem value="10">10 segundos</SelectItem>
                        <SelectItem value="30">30 segundos</SelectItem>
                        <SelectItem value="60">1 minuto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agendamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione quando enviar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="now">Enviar agora</SelectItem>
                        <SelectItem value="schedule">Agendar envio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scheduled Date (if schedule selected) */}
            {form.watch('scheduleType') === 'schedule' && (
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Hora do Envio</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button 
                type="submit" 
                className="flex-1 bg-whatsapp hover:bg-whatsapp-dark text-white font-medium"
                disabled={createCampaignMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                {createCampaignMutation.isPending ? 'Criando Campanha...' : 'Iniciar Campanha'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="font-medium"
                disabled={createCampaignMutation.isPending}
                onClick={onSaveDraft}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
