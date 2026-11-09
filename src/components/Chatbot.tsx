import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
const Chatbot = () => {
 const {data:flags}=useFeatureFlags();
 if (!flags?.chatbot_enabled) return null;
 return <Button asChild size="icon" className="fixed bottom-24 right-4 z-40 rounded-full" title="Atendimento LeleCute"><Link to="/suporte" aria-label="Abrir suporte"><MessageCircle/></Link></Button>;
};
export default Chatbot;
