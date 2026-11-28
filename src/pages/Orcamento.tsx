import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import QuoteFormSection from "@/components/QuoteFormSection";
import DynamicSEO from "@/components/DynamicSEO";
import BreadcrumbStructuredData from "@/components/BreadcrumbStructuredData";

const Orcamento = () => {
  const breadcrumbItems = [
    { name: 'Início', url: 'https://emporiolelecute.com.br/' },
    { name: 'Orçamento', url: 'https://emporiolelecute.com.br/orcamento' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DynamicSEO
        title="Solicitar Orçamento | Empório LeleCute"
        description="Solicite um orçamento personalizado para suas lembrancinhas artesanais. Atendimento via WhatsApp."
        url="https://emporiolelecute.com.br/orcamento"
      />
      <BreadcrumbStructuredData items={breadcrumbItems} />
      <Header />
      <main className="pt-20">
        <QuoteFormSection pageHeading />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Orcamento;
