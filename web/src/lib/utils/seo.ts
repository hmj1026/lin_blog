export function buildArticleJsonLd(params: {
  url: string;
  title: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": params.url,
    },
    headline: params.title,
    description: params.description,
    image: params.image ? [params.image] : undefined,
    datePublished: params.datePublished,
    dateModified: params.dateModified ?? params.datePublished,
    author: {
      "@type": "Person",
      name: params.authorName,
    },
  };
}
