import { useFooterConfig } from '@/hooks/useStoreSettings';
import { CANONICAL_ORIGIN } from '@/lib/urls';
import { buildBusinessSchema } from '@/lib/business-schema';

const OrganizationStructuredData = () => {
  const { data: footer } = useFooterConfig();
  const structuredData = buildBusinessSchema({
    origin: CANONICAL_ORIGIN, logo: '/logo.webp',
    description: footer?.brand_description,
    phone: footer?.contacts.phone,
    socialUrls: footer ? Object.values(footer.social_links) : [],
  });

  return (
      <script id="store-organization" type="application/ld+json">
        {JSON.stringify(structuredData).replace(/</g, '\\u003c')}
      </script>
  );
};

export default OrganizationStructuredData;
