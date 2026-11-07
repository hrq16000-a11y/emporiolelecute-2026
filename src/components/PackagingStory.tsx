import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PackagingStory = () => {
  const { data } = useQuery({ queryKey: ['editorial-story', 'packaging'], queryFn: async () => {
    const { data, error } = await supabase.from('editorial_stories').select('*').eq('story_key', 'packaging').eq('is_published', true).maybeSingle();
    if (error) throw error;
    return data;
  }});
  if (!data) return null;
  return <section className="mb-12 border-t border-border pt-8" aria-labelledby="packaging-title"><h2 id="packaging-title" className="font-display text-2xl font-light">{data.title}</h2>{data.image_url && <img src={data.image_url} alt="Embalagem do pedido Empório LeleCute" className="mt-5 aspect-[4/5] w-full max-w-sm object-contain" loading="lazy" />}<p className="mt-4 max-w-prose whitespace-pre-line text-muted-foreground leading-relaxed">{data.body}</p></section>;
};
export default PackagingStory;