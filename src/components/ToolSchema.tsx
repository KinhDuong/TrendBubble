import { Helmet } from 'react-helmet-async';

interface ToolSchemaProps {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
  screenshot?: string | string[];
}

export default function ToolSchema({
  name,
  description,
  url,
  applicationCategory = 'BusinessApplication',
  operatingSystem = 'Any',
  offers = {
    price: '0',
    priceCurrency: 'USD'
  },
  screenshot
}: ToolSchemaProps) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": name,
    "description": description,
    "url": url,
    "applicationCategory": applicationCategory,
    "operatingSystem": operatingSystem,
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "offers": {
      "@type": "Offer",
      "price": offers.price,
      "priceCurrency": offers.priceCurrency
    },
    "featureList": "Interactive visualization, Data analysis, Export functionality, Real-time updates",
    ...(screenshot && { "screenshot": screenshot }),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
}
