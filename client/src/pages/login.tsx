import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MessageSquare, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const { checkAuth } = useAuth();
  const [showFirstAccess, setShowFirstAccess] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: async () => {
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao Campaign Manager!",
      });
      // Refresh auth state and redirect
      await checkAuth();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const firstAccessMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("POST", "/api/auth/first-access", data);
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado",
        description: "Primeiro acesso configurado com sucesso!",
      });
      setShowFirstAccess(false);
      // Login automatically after creating first user
      setTimeout(() => {
        loginMutation.mutate(form.getValues());
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    if (showFirstAccess) {
      firstAccessMutation.mutate(data);
    } else {
      loginMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="w-20 h-20 bg-whatsapp rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg 
              viewBox="0 0 24 24" 
              className="w-12 h-12 text-white"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.49 3.488"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Manager</h1>
          <p className="text-gray-600 mt-2">WhatsApp Automation Platform</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {showFirstAccess ? "Primeiro Acesso" : "Entrar na Plataforma"}
            </CardTitle>
            {showFirstAccess && (
              <p className="text-sm text-gray-600 text-center">
                Configure o usuário administrador para primeiro acesso
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite seu usuário" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Digite sua senha" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-whatsapp hover:bg-whatsapp-dark text-white"
                    disabled={loginMutation.isPending || firstAccessMutation.isPending}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {showFirstAccess 
                      ? (firstAccessMutation.isPending ? 'Criando...' : 'Criar Usuário')
                      : (loginMutation.isPending ? 'Entrando...' : 'Entrar')
                    }
                  </Button>

                  {!showFirstAccess && (
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowFirstAccess(true)}
                    >
                      Primeiro Acesso
                    </Button>
                  )}

                  {showFirstAccess && (
                    <Button 
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowFirstAccess(false)}
                    >
                      Voltar ao Login
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Default Credentials Info */}
        {!showFirstAccess && (
          <div className="text-center text-sm text-gray-600 bg-white p-4 rounded-lg shadow">
            <p className="font-medium">Credenciais padrão:</p>
            <p>Usuário: <code className="bg-gray-100 px-2 py-1 rounded">admin</code></p>
            <p>Senha: <code className="bg-gray-100 px-2 py-1 rounded">admin123</code></p>
          </div>
        )}
      </div>
    </div>
  );
}