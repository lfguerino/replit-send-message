import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, X, Play, Save, Settings, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1, "Nome da campanha é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  messageBlocks: z.array(z.string()).optional(),
  messageInterval: z.number(),
  scheduleType: z.string(),
  scheduledAt: z.string().optional(),
  showTyping: z.boolean().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export function CampaignForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileStats, setFileStats] = useState<{ contacts: number; size: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [messageBlocks, setMessageBlocks] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      message: "",
      messageBlocks: [],
      messageInterval: 5,
      scheduleType: "now",
      showTyping: true,
    },
  });

  const createCampaignMutation = useMutation({  
    mutationFn: async (data: CampaignFormData & { file?: File; status?: string }) => {

      console.log("Botão clicado para criar a campanha 🚀");
      
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('message', data.message);
      formData.append('messageBlocks', JSON.stringify(messageBlocks.filter(block => block.trim() !== '')));
      formData.append('messageInterval', '5');
      formData.append('scheduleType', data.scheduleType);
      formData.append('showTyping', String(data.showTyping ?? true));
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
      setMessageBlocks([]);
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

  // Message blocks management
  const addMessageBlock = () => {
    setMessageBlocks([...messageBlocks, '']);
  };

  const removeMessageBlock = (index: number) => {
    const newBlocks = messageBlocks.filter((_, i) => i !== index);
    setMessageBlocks(newBlocks);
  };

  const updateMessageBlock = (index: number, value: string) => {
    const newBlocks = [...messageBlocks];
    newBlocks[index] = value;
    setMessageBlocks(newBlocks);
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
    console.log("Salvando rascunho da campanha 📝");
    const data = form.getValues();
    
    // Validate required fields for draft
    if (!data.name?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome da campanha é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.message?.trim()) {
      toast({
        title: "Campo obrigatório", 
        description: "Mensagem é obrigatória",
        variant: "destructive",
      });
      return;
    }
    
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
                  <FormLabel>Mensagem Principal</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={6}
                      className="min-h-[150px]"
                      placeholder="Digite sua mensagem principal aqui..." 
                      {...field} 
                      data-testid="textarea-main-message"
                    />
                  </FormControl>
                  <FormDescription>
                    Primeira mensagem a ser enviada. Você pode usar variáveis: {"{nome}"}, {"{telefone}"}, {"{empresa}"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message Blocks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <FormLabel>Mensagens Adicionais</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMessageBlock}
                  data-testid="button-add-message-block"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Bloco
                </Button>
              </div>
              
              {messageBlocks.length > 0 && (
                <>
                  {messageBlocks.map((block, index) => (
                    <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Bloco {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMessageBlock(index)}
                          data-testid={`button-remove-block-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <Textarea
                        rows={4}
                        placeholder={`Digite o conteúdo do bloco ${index + 1}...`}
                        value={block}
                        onChange={(e) => updateMessageBlock(index, e.target.value)}
                        data-testid={`textarea-message-block-${index}`}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Este bloco será enviado após a mensagem principal, respeitando a cadência de 5 segundos
                      </p>
                    </div>
                  ))}
                  
                  <p className="text-sm text-gray-600 mt-2">
                    {messageBlocks.filter(block => block.trim() !== '').length > 0 && (
                      <>
                        Serão enviados {messageBlocks.filter(block => block.trim() !== '').length + 1} mensagens para cada contato:
                        <br />
                        1 mensagem principal + {messageBlocks.filter(block => block.trim() !== '').length} blocos adicionais
                      </>
                    )}
                  </p>
                </>
              )}
              
              {messageBlocks.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Clique em "Adicionar Bloco" para criar mensagens adicionais que serão enviadas sequencialmente para cada contato.
                </p>
              )}
            </div>

            {/* Typing Indicator Option */}
            <FormField
              control={form.control}
              name="showTyping"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Indicador de Digitação
                    </FormLabel>
                    <FormDescription>
                      Mostra "digitando..." antes de cada mensagem para simular conversa natural
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-typing-indicator"
                    />
                  </FormControl>
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

            {/* Hidden fields with default values */}
            <input type="hidden" {...form.register('messageInterval')} />
            <input type="hidden" {...form.register('scheduleType')} />

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
