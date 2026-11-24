import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles, MinusCircle, Loader2 } from 'lucide-react';
import { setPrivateMotionScope, useReducedMotion } from '@/hooks/useReducedMotion';
import { useToast } from '@/hooks/use-toast';

const preferenceKey = 'admin.motion.reduced';

const AdminMotionPreference = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const client = useQueryClient();
  const { systemEnabled } = useReducedMotion();
  const queryKey = ['private-motion-preference', userId];
  const { data: reduced = false, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_preferences').select('value')
        .eq('user_id', userId).eq('key', preferenceKey).maybeSingle();
      if (error) throw error;
      return data?.value === '1';
    },
  });
  useEffect(() => {
    setPrivateMotionScope(userId, reduced);
    return () => setPrivateMotionScope(null, false);
  }, [userId, reduced]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: identity, error: authError } = await supabase.auth.getUser();
      if (authError || identity.user?.id !== userId) throw new Error('Sessão inválida. Entre novamente.');
      const { data: authorized, error: roleError } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (roleError || !authorized) throw new Error('Acesso não autorizado.');
      const next = !reduced;
      const { error } = await supabase.from('user_preferences').upsert({ user_id: userId, key: preferenceKey, value: next ? '1' : '0' }, { onConflict: 'user_id,key' });
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => client.setQueryData(queryKey, next),
    onError: () => toast({ title: 'Não foi possível salvar a preferência', description: 'Tente novamente.', variant: 'destructive' }),
  });

  return (
    <Button variant="outline" className="min-h-11 gap-2" disabled={isLoading || isError || mutation.isPending}
      onClick={() => mutation.mutate()} aria-pressed={reduced}
      aria-label={reduced ? 'Reativar animações do meu painel' : 'Reduzir animações do meu painel'}
      title={systemEnabled ? 'Seu dispositivo solicita movimento reduzido' : 'Preferência do meu painel'}>
      {mutation.isPending || isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : reduced ? <MinusCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      Animações {reduced || systemEnabled ? 'reduzidas' : 'ativas'}
    </Button>
  );
};

export default AdminMotionPreference;