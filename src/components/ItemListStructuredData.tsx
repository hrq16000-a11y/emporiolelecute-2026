import { Helmet } from 'react-helmet-async';
import { urls, CANONICAL_ORIGIN } from '@/lib/urls';
import { parseSafePriceMonitored } from '@/lib/safePrice';

interface ItemListProduct {
  name: string;
  description: string;
  image: string;
  /** Pode chegar como string do Supabase (numeric) ou legado "R$ 95,00". */
  price: number | string | null | undefined;
  slug: string;
}

interface ItemListStructuredDataProps {
  products: ItemListProduct[];
  listName?: string;
}

const ItemListStructuredData = ({ products, listName = "Produtos em Destaque" }: ItemListStructuredDataProps) => {
  if (!products || products.length === 0) return null;

  // Calculate priceValidUntil - one year from now in YYYY-MM-DD format
  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);
  const priceValidUntilStr = priceValidUntil.toISOString().split('T')[0];

  const structuredData = buildItemListJsonLd(products, listName, priceValidUntilStr);


  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

// CANONICAL_ORIGIN re-exported para call-sites que precisem usar baseUrl puro.
export { CANONICAL_ORIGIN };
export default ItemListStructuredData;
