import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, LogIn } from "lucide-react";
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
        title: "Acesso autorizado",
        description: "Bem-vindo ao WhatsApp Campaign Manager!",
      });
      await checkAuth();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Acesso negado",
        description: "Usuário ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="relative w-full max-w-lg space-y-8 px-6">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-emerald-400/20">
            <Shield className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">WhatsApp Campaign Manager</h1>
          <p className="text-slate-300 text-lg">Sistema de Automação Empresarial</p>
        </div>

        <Card className="shadow-2xl border border-slate-700/50 bg-white/5 backdrop-blur-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-white">
              Acesso Restrito
            </CardTitle>
            <p className="text-slate-300 text-sm mt-2">
              Digite suas credenciais para acessar a plataforma
            </p>
          </CardHeader>
          <CardContent className="pb-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200 font-medium">Usuário</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite seu usuário" 
                          className="bg-white/10 border-slate-600 text-white placeholder:text-slate-400 h-12 focus:border-emerald-500 focus:ring-emerald-500/20"
                          {...field} 
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200 font-medium">Senha</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Digite sua senha" 
                          className="bg-white/10 border-slate-600 text-white placeholder:text-slate-400 h-12 focus:border-emerald-500 focus:ring-emerald-500/20"
                          {...field} 
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <div className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    <LogIn className="w-5 h-5 mr-3" />
                    {loginMutation.isPending ? 'Verificando...' : 'Entrar'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center text-slate-400 text-sm">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Sistema protegido por autenticação
          </p>
        </div>
      </div>
    </div>
  );
}