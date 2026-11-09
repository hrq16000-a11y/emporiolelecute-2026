import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import { SupportWorkspace } from '@/components/support/SupportWorkspace';
const Suporte = () => <><Helmet><title>Atendimento | Empório LeleCute</title><meta name="robots" content="noindex,nofollow"/></Helmet><Header/><div className="pt-36 pb-24"><SupportWorkspace/></div></>;
export default Suporte;
