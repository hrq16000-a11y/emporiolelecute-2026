import { Helmet } from 'react-helmet-async';

const WebSiteStructuredData = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://emporiolelecute.com.br/#website",
    "url": "https://emporiolelecute.com.br",
    "name": "Empório LeleCute",
    "description": "Lembrancinhas artesanais personalizadas para maternidade, chá de bebê, batizado, casamento e aniversário.",
    "publisher": {
      "@id": "https://emporiolelecute.com.br/#organization"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://emporiolelecute.com.br/buscar?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "inLanguage": "pt-BR"
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default WebSiteStructuredData;
