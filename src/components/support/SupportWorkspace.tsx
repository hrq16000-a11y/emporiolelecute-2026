import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { MessageCircle, Plus, UserRound, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContactInfo } from '@/hooks/useContactInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import { Shimmer } from '@/components/ai-elements/shimmer';
import logo from '@/assets/logo.webp';
const names: Record<string,string> = {search_help:'Central de ajuda',get_orders:'Seus pedidos',handoff:'Equipe LeleCute'};
const statusNames: Record<string,string> = {open:'Suporte virtual',human:'Aguardando equipe',resolved:'Conversa encerrada'};
export const SupportWorkspace = ({ admin = false }: {admin?: boolean}) => {
 const { threadId } = useParams(); const navigate = useNavigate(); const client = useQueryClient();
 const {user,session,loading,signIn,signUp} = useAuth(); const [mode,setMode] = useState<'login'|'signup'>('login'); const [notice,setNotice] = useState(''); const {buildWhatsappUrl} = useContactInfo();
 const [error,setError] = useState(''); const [email,setEmail] = useState(''); const [password,setPassword] = useState(''); const [loginBusy,setLoginBusy] = useState(false);
 const base = admin ? '/admin/suporte' : '/suporte';
 const threads = useQuery({queryKey:['support-threads',user?.id,admin], enabled:!!user, refetchInterval:10000, meta:{silent:true},queryFn:async()=>{
  let q = supabase.from('support_threads').select('*').order('updated_at',{ascending:false}); if(!admin && user) q=q.eq('user_id',user.id);
  const {data,error}=await q; if(error)throw error;return data;
 }});
 const create = async()=>{if(!user)return;setError('');const {data,error}=await supabase.from('support_threads').insert({user_id:user.id}).select().single();if(error){setError('Não foi possível abrir a conversa.');return;}await threads.refetch();navigate(`${base}/${data.id}`);};
 const remove = async(id:string)=>{const {error}=await supabase.from('support_threads').delete().eq('id',id);if(error){setError('Não foi possível apagar a conversa.');return;} await threads.refetch();if(threadId===id)navigate(base);};
 if(loading)return <p className="p-6">Carregando suporte…</p>;
 if(!user)return <section className="mx-auto max-w-md py-10 px-4"><h1 className="font-display text-2xl mb-6">Atendimento LeleCute</h1><form className="space-y-4" onSubmit={async e=>{e.preventDefault();setLoginBusy(true);setNotice('');if(mode==='signup'){const r=await signUp(email,password);setError(r.error?'Não foi possível criar a conta. Tente outro e-mail ou uma senha mais forte.':'');if(!r.error)setNotice('Conta criada! Confira seu e-mail para confirmar e depois entre aqui.');setLoginBusy(false);return;}const result=await signIn(email,password);setError(result.error?'Não foi possível entrar. Confira e-mail e senha.':'');setLoginBusy(false);}}><p className="text-muted-foreground text-sm">{mode==='login'?'Entre para conversar e guardar seu histórico de atendimento.':'Crie sua conta grátis para conversar com a gente.'}</p><label className="block">E-mail<Input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block">Senha<Input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label><Button disabled={loginBusy} type="submit">{mode==='login'?'Entrar':'Criar conta'}</Button><Button type="button" variant="link" className="px-0" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setNotice('');}}>{mode==='login'?'Ainda não tem conta? Criar conta':'Já tem conta? Entrar'}</Button></form>{notice&&<p role="status" className="mt-4 text-sm">{notice}</p>}<Button className="mt-4" variant="outline" asChild><a href={buildWhatsappUrl('Olá! Preciso de ajuda com a loja.')} target="_blank" rel="noreferrer">Atendimento pelo WhatsApp</a></Button>{error&&<p role="alert" className="text-destructive mt-4">{error}</p>}</section>;
 const current=threads.data?.find(t=>t.id===threadId);
 return <section className="mx-auto max-w-6xl px-4 py-6"><header className="flex items-center gap-3 border-b pb-4"><img src={logo} alt="Empório LeleCute" className="w-14 h-14 object-contain"/><h1 className="font-display text-2xl">{admin?'Atendimentos':'Atendimento LeleCute'}</h1></header>{error&&<p role="alert" className="text-destructive">{error}</p>}<div className="grid md:grid-cols-[240px_minmax(0,1fr)] gap-6 pt-5"><aside className="min-w-0">{!admin&&<Button onClick={create} className="w-full mb-3"><Plus/>Nova conversa</Button>}{threads.isError&&<p role="alert">Não foi possível carregar as conversas.<Button variant="link" onClick={()=>threads.refetch()}>Tentar novamente</Button></p>}<nav aria-label="Conversas" className="max-h-28 md:max-h-[600px] overflow-y-auto space-y-1">{threads.data?.map(t=><div key={t.id} className="flex min-w-0 items-center"><Button asChild variant={threadId===t.id?'secondary':'ghost'} className="flex-1 min-w-0 h-auto min-h-11 justify-start py-3"><Link to={`${base}/${t.id}`} className="flex-col items-start"><span className="truncate max-w-full">{t.title}</span><span className="text-xs text-muted-foreground">{statusNames[t.status]}</span></Link></Button>{!admin&&<Button variant="ghost" size="icon" aria-label="Apagar conversa" title="Apagar conversa" onClick={()=>remove(t.id)}><Trash2/></Button>}</div>)}</nav></aside><main className="min-w-0">{threadId&&session&&current?<ChatWindow key={threadId} threadId={threadId} token={session.access_token} admin={admin} state={current.status} onUpdate={()=>{void client.invalidateQueries({queryKey:['support-threads']});}}/>:<p className="text-muted-foreground py-12">{threadId&&threads.isFetched?'Conversa não encontrada.':'Selecione uma conversa.'}</p>}</main></div></section>;
};
const ChatWindow = ({threadId,token,admin,state,onUpdate}:{threadId:string;token:string;admin:boolean;state:string;onUpdate:()=>void})=>{
 const [messages,setMessages]=useState<UIMessage[]>([]);const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const abortRef=useRef<AbortController>();const {buildWhatsappUrl}=useContactInfo();
 const history=useQuery({queryKey:['support-messages',threadId],refetchInterval:busy?false:5000,meta:{silent:true},queryFn:async()=>{const {data,error}=await supabase.from('support_messages').select('ui_message').eq('thread_id',threadId).order('created_at');if(error)throw error;return data.map(r=>r.ui_message as unknown as UIMessage);}});
 useEffect(()=>{if(history.data&&!busy)setMessages(history.data);},[history.data,busy]);
 useEffect(()=>()=>abortRef.current?.abort(),[]);
 const send=async(action:'send'|'handoff'|'reply'|'resolve'='send')=>{
  if(state==='resolved'||busy||(!text.trim()&&action!=='handoff'&&action!=='resolve'))return;
  const value=text.trim()||(action==='handoff'?'Quero falar com uma pessoa':'Encerrar conversa');const requestId=crypto.randomUUID();const assistantId=crypto.randomUUID();setError('');setBusy(true);setText('');document.querySelector<HTMLTextAreaElement>('#support-message')?.focus();
  if(action!=='resolve')setMessages(prev=>[...prev,{id:requestId,role:admin?'assistant':'user',parts:[{type:'text',text:value}]}]);
  const controller=new AbortController();abortRef.current=controller;
  try{
   const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`,{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({threadId,requestId,text:value,action})});
   if(!response.ok){const result=await response.json();throw new Error(result.error||'Não foi possível enviar.');}
   if(response.headers.get('content-type')?.includes('application/json')){await response.json();}
   else{
    if(!response.body)throw new Error('Resposta indisponível.');const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let answer='';let completed=false;let parts:UIMessage['parts']=[];
    while(true){const {value:chunk,done}=await reader.read();if(done)break;buffer+=decoder.decode(chunk,{stream:true});let end;
     while((end=buffer.indexOf('\n\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+2);if(!line.startsWith('data: '))continue;const event=JSON.parse(line.slice(6));
      if(event.type==='error')throw new Error(event.error);
      if(event.type==='delta')answer+=event.text;
      if(event.type==='tool')parts=[...parts,event.part];
      if(event.type==='done'){completed=true;setMessages(prev=>[...prev.filter(m=>m.id!==assistantId),event.message]);continue;}
      setMessages(prev=>[...prev.filter(m=>m.id!==assistantId),{id:assistantId,role:'assistant',parts:[...parts,{type:'text',text:answer}]}]);
     }
    }
    if(!completed)throw new Error('A resposta foi interrompida. Confira o histórico antes de enviar novamente.');
   }
  }catch(e){setError(e instanceof Error&&e.name==='AbortError'?'Resposta interrompida. A mensagem enviada foi preservada.':e instanceof Error?e.message:'Não foi possível responder.');}
  finally{setBusy(false);await history.refetch();onUpdate();document.querySelector<HTMLTextAreaElement>('#support-message')?.focus();}
 };
 return <div className="flex flex-col h-[min(760px,65dvh)] min-h-[360px] md:min-h-[480px]"><div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b"><span className="text-sm text-muted-foreground">{statusNames[state]}</span><div className="flex gap-2">{admin?<Button size="sm" variant="outline" disabled={busy||state==='resolved'} onClick={()=>send('resolve')}><Check/>Encerrar</Button>:<Button size="sm" variant="outline" disabled={busy||state!=='open'} onClick={()=>send('handoff')}><UserRound/>Falar com uma pessoa</Button>}</div></div><Conversation className="min-h-0"><ConversationContent>{history.isPending&&<p role="status" className="text-muted-foreground">Carregando mensagens…</p>}{messages.map(m=><Message key={m.id} from={m.role}><MessageContent className={m.role==='user'?'bg-primary text-primary-foreground':'bg-transparent text-foreground'}>{m.parts.map((part,i)=>part.type==='text'?<MessageResponse key={i}>{part.text}</MessageResponse>:part.type==='dynamic-tool'?<Tool key={i} defaultOpen={false}><ToolHeader type="dynamic-tool" toolName={part.toolName} title={names[part.toolName]||part.toolName} state={part.state}/><ToolContent><ToolInput input={part.input}/><ToolOutput output={part.output} errorText={part.errorText}/></ToolContent></Tool>:null)}</MessageContent></Message>)}{busy&&<Shimmer>Consultando informações…</Shimmer>}</ConversationContent><ConversationScrollButton/></Conversation>{(error||history.isError)&&<p role="alert" className="text-sm text-destructive py-2">{error||'Não foi possível carregar as mensagens.'}</p>}{state==='human'&&!admin&&<Button asChild variant="link" className="justify-start"><a href={buildWhatsappUrl(`Olá! Preciso continuar o atendimento da conversa ${threadId}.`)} target="_blank" rel="noreferrer"><MessageCircle/>Continuar pelo WhatsApp</a></Button>}<PromptInput onSubmit={()=>send(admin?'reply':'send')}><PromptInputTextarea id="support-message" disabled={busy||state==='resolved'} aria-label="Mensagem" placeholder={admin?'Responder ao cliente…':'Digite sua dúvida…'} value={text} onChange={e=>setText(e.target.value)} maxLength={4000}/><PromptInputFooter className="justify-end"><PromptInputSubmit className="min-h-11 min-w-11" aria-label={busy?'Parar resposta':'Enviar mensagem'} status={busy?'submitted':'ready'} disabled={state==='resolved'||(!busy&&!text.trim())} onStop={()=>abortRef.current?.abort()}/></PromptInputFooter></PromptInput></div>;
};
