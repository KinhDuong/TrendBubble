import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = process.env.VITE_BASE_URL || 'https://topbestcharts.com';

function convertMarkdownToHTML(markdown) {
  if (!markdown) return '';

  let html = markdown;

  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-top: 1.5rem; margin-bottom: 0.75rem;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-top: 2rem; margin-bottom: 1rem;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 2rem; font-weight: 700; color: #111827; margin-top: 2rem; margin-bottom: 1rem;">$1</h1>');

  // Convert bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #111827;">$1</strong>');

  // Convert unordered lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.5rem;">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/gs, '<ul style="list-style-type: disc; margin-bottom: 1rem;">$&</ul>');

  // Convert numbered lists
  html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.5rem;">$1</li>');

  // Convert paragraphs (double line breaks)
  html = html.split('\n\n').map(para => {
    para = para.trim();
    if (!para) return '';
    if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') || para.startsWith('<li')) {
      return para;
    }
    return `<p style="margin-bottom: 1rem; line-height: 1.75;">${para.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

function generateFooterHTML() {
  const currentYear = new Date().getFullYear();
  return `
    <!-- Footer for SEO -->
    <footer style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; color: #4b5563;">
      <div style="max-width: 80rem; margin: 0 auto; padding: 2rem 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
          <!-- Desktop grid layout -->
          <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 2rem;">
            <!-- Logo Column -->
            <div style="display: flex; align-items: center; justify-content: flex-start;">
              <div style="position: relative; width: 6rem; height: 6rem; border-radius: 9999px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 4px solid #2563eb; display: flex; align-items: center; justify-content: center; background: transparent;">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="20" y2="10"></line>
                  <line x1="18" x2="18" y1="20" y2="4"></line>
                  <line x1="6" x2="6" y1="20" y2="16"></line>
                </svg>
              </div>
            </div>

            <!-- Features Column -->
            <div>
              <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: #111827;">
                Features
              </h3>
              <ul style="font-size: 0.875rem; list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 0.5rem;">Top List – Quickly browse the highest-ranked items in a clean, easy-to-read format</li>
                <li style="margin-bottom: 0.5rem;">Bubble Chart – Visualize data based on scale and impact</li>
                <li style="margin-bottom: 0.5rem;">Bar Chart – Compare items side-by-side with clarity</li>
                <li style="margin-bottom: 0.5rem;">Donut Chart – View proportional breakdowns in a modern, intuitive layout</li>
                <li style="margin-bottom: 0.5rem;">Treemap – Explore hierarchical data with a clear visual structure</li>
              </ul>
            </div>

            <!-- About Column -->
            <div>
              <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: #111827;">
                About
              </h3>
              <p style="font-size: 0.875rem;">
                We turn boring rankings into beautiful, interactive stories.
                Every bubble, bar, and sparkline is built from the latest official data and refreshed the moment new numbers drop. No fluff, no paywalls - just the clearest and most up-to-date data. Made by data nerds, for the endlessly curious.
              </p>
            </div>
          </div>
        </div>

        <!-- Copyright -->
        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
          <div style="text-align: center; font-size: 0.875rem;">
            <p>${currentYear} Top Best Charts. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  `;
}

async function fetchPages() {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pages:', error);
    return [];
  }

  return data || [];
}

async function fetchTopicsForPage(pageSource) {
  let query = supabase
    .from('trending_topics')
    .select('*');

  if (pageSource !== 'all') {
    query = query.eq('source', pageSource);
  }

  const { data, error } = await query
    .order('rank', { ascending: true })
    .limit(1000);

  if (error) {
    console.error('Error fetching topics:', error);
    return [];
  }

  return data || [];
}

async function getSourceLabel(sourceValue) {
  if (sourceValue === 'google_trends') return 'Google Trends';
  if (sourceValue === 'user_upload') return 'My Uploads';
  if (sourceValue === 'all') return 'All';

  const { data } = await supabase
    .from('custom_sources')
    .select('label')
    .eq('value', sourceValue)
    .maybeSingle();

  return data?.label || sourceValue.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function generateMetaTags(pageData, topics) {
  const topTopics = [...topics]
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 5)
    .map(t => t.name.replace(/"/g, ''))
    .join(', ');

  const lastUpdated = topics.length > 0
    ? new Date(Math.max(...topics.map(t => new Date(t.pub_date || t.created_at || Date.now()).getTime())))
    : new Date();

  const currentYear = new Date().getFullYear();
  const extractTopicType = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('trending topics')) {
      return title.replace(/trending topics/i, '').trim();
    }
    return title;
  };
  const topicType = extractTopicType(pageData.meta_title);
  const rankingTitle = `Top ${topics.length} ${topicType || 'Trending Topics'} (${currentYear})`;

  const enhancedTitle = pageData.meta_title;

  let enhancedDescription = pageData.meta_description;
  if (topTopics) {
    enhancedDescription += ` Top trending: ${topTopics}. Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}.`;
  }

  const keywords = topics.slice(0, 10).map(t => t.name.replace(/"/g, '')).join(', ') + ', trending topics, search trends, real-time trends, trend analysis';

  const pageUrl = `${BASE_URL}${pageData.page_url}`;

  const ogImageTag = pageData.cover_image ? `
    <meta property="og:image" content="${pageData.cover_image}" data-prerendered />
    <meta name="twitter:image" content="${pageData.cover_image}" data-prerendered />` : '';

  return `
    <title>${enhancedTitle}</title>
    <meta name="description" content="${enhancedDescription}" data-prerendered />
    <meta name="keywords" content="${keywords}" data-prerendered />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${pageUrl}" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${pageUrl}" data-prerendered />
    <meta property="og:title" content="${enhancedTitle}" data-prerendered />
    <meta property="og:description" content="${enhancedDescription}" data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />${ogImageTag}

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="${enhancedTitle}" data-prerendered />
    <meta name="twitter:description" content="${enhancedDescription}" data-prerendered />
  `;
}

async function generateContentHTML(pageData, topics, sourceLabel) {
  const topTopics = [...topics]
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 1000);

  const isCryptoPage = pageData.source === 'coingecko_crypto';

  const lastUpdated = topics.length > 0
    ? new Date(Math.max(...topics.map(t => new Date(t.pub_date || t.created_at || Date.now()).getTime())))
    : new Date();

  const formattedDate = lastUpdated.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  let contentHTML = `
    <!-- Header Navigation for SEO -->
    <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
      <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
        <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
          <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
        </a>
        <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
          <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
          <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
          <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
          <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
          <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
        </ul>
      </nav>
    </header>

    <!-- Filter Menu for SEO -->
    <nav aria-label="Content filters" style="background-color: #f9fafb; padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb;">
      <div style="max-width: 80rem; margin: 0 auto;">
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; font-size: 0.875rem; color: #4b5563;">
          <span>View Modes:</span>
          <a href="?view=bubble" style="color: #93c5fd; text-decoration: none;">Bubble Chart</a>
          <a href="?view=bar" style="color: #93c5fd; text-decoration: none;">Bar Chart</a>
          <a href="?view=list" style="color: #93c5fd; text-decoration: none;">List View</a>
          <span style="margin-left: 1rem;">Filters:</span>
          <a href="?date=now" style="color: #93c5fd; text-decoration: none;">Trending Now</a>
          <a href="?date=24h" style="color: #93c5fd; text-decoration: none;">24 Hours</a>
          <a href="?date=week" style="color: #93c5fd; text-decoration: none;">Week</a>
          <a href="?date=month" style="color: #93c5fd; text-decoration: none;">Month</a>
          <a href="?date=year" style="color: #93c5fd; text-decoration: none;">Year</a>
          <a href="?date=all" style="color: #93c5fd; text-decoration: none;">All Time</a>
        </div>
      </div>
    </nav>

    <article class="dynamic-page-article" style="max-width: 80rem; margin: 0 auto; padding: 0 0.5rem;">
      <header class="page-header" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 2rem; margin-top: 2rem;">
        <h1 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">${pageData.meta_title}</h1>
        <p style="color: #4b5563; font-size: 1rem; line-height: 1.625; margin-bottom: 1rem;">${pageData.meta_description}</p>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.875rem;">
          <time style="color: #6b7280;">
            Last updated: ${formattedDate} ET
          </time>
          <a href="#top-trending-heading" style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; background-color: #dbeafe; color: #1e40af; text-decoration: none; display: inline-block;">
            View Top ${topics.length} ${sourceLabel}
          </a>
        </div>
      </header>
    </article>
  `;

  // Add topic rankings for SEO - moved before summary
  const currentYear = new Date().getFullYear();

  const extractTopicType = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('trending topics')) {
      return title.replace(/trending topics/i, '').trim();
    }
    return title;
  };

  const topicType = extractTopicType(pageData.meta_title);
  const rankingTitle = `Top ${topTopics.length} ${topicType || 'Trending Topics'} (${currentYear})`;

  contentHTML += `
    <section class="top-topics" aria-labelledby="top-trending-heading" itemscope itemtype="https://schema.org/ItemList" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 0.5rem;">
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
        <h2 id="top-trending-heading" style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #111827;">
          ${rankingTitle}
        </h2>
        ${pageData.intro_text ? `<p style="color: #4b5563; font-size: 0.875rem; line-height: 1.625; margin-bottom: 1rem;">${pageData.intro_text}</p>` : ''}
        <ol class="topics-list" style="list-style: none; padding: 0; margin: 0;">
  `;

  topTopics.forEach((topic, index) => {
    const searchVolume = topic.search_volume_raw || topic.search_volume;
    const rank = index + 1;
    contentHTML += `
          <li style="padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: flex-start; gap: 0.75rem;" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <meta itemprop="position" content="${rank}" />
            <span style="color: #6b7280; font-weight: 600; min-width: 2.5rem;">${rank}</span>
            <div style="flex: 1;" itemprop="item" itemscope itemtype="https://schema.org/Thing">
              <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0 0 0.25rem 0;" itemprop="name">${topic.name.replace(/"/g, '')}</h3>
              <p style="color: #6b7280; font-size: 0.875rem; margin: 0;" itemprop="description">${searchVolume.toString().replace(/"/g, '')}</p>
              ${topic.category ? `<span style="display: inline-block; margin-top: 0.25rem; padding: 0.125rem 0.5rem; background-color: #e5e7eb; color: #4b5563; font-size: 0.75rem; border-radius: 0.25rem;">${topic.category}</span>` : ''}
            </div>
          </li>
    `;
  });

  contentHTML += `
        </ol>
      </div>
    </section>
  `;

  if (pageData.summary) {
    contentHTML += `
      <section class="page-summary" aria-labelledby="page-summary" itemscope itemtype="https://schema.org/Article" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 0.5rem;">
        <div class="summary-container" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
          ${pageData.cover_image ? `
          <div style="margin-bottom: 1.5rem; border-radius: 0.75rem; overflow: hidden;">
            <img src="${pageData.cover_image}" alt="${pageData.meta_title}" style="width: 100%; height: 24rem; object-fit: cover;" />
          </div>` : ''}
          <div class="summary-content" itemprop="articleBody">
            ${pageData.summary}
          </div>
          <meta itemprop="author" content="Top Best Charts" />
          <meta itemprop="datePublished" content="${pageData.created_at}" />
        </div>
      </section>
    `;
  }

  if (pageData.faq) {
    contentHTML += `
      <section class="page-faq" aria-labelledby="page-faq" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 0.5rem;">
        <div class="faq-container" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
          <div class="summary-content">
            ${pageData.faq}
          </div>
        </div>
      </section>
    `;
  }

  // Add category pages section for SEO
  if (pageData.category) {
    const { data: categoryPages } = await supabase
      .from('pages')
      .select('*')
      .eq('category', pageData.category)
      .neq('page_url', pageData.page_url)
      .order('created_at', { ascending: false })
      .limit(10);

    if (categoryPages && categoryPages.length > 0) {
      const categoryTitle = pageData.category.toUpperCase();
      contentHTML += `
        <section class="category-pages" aria-labelledby="category-pages-heading" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 1rem;">
          <div style="position: relative; margin-bottom: 1.5rem;">
            <h2 id="category-pages-heading" style="font-size: 1.5rem; font-weight: 700; color: #111827; display: inline-block; padding: 0.5rem 1rem; position: relative;">
              <span style="position: relative; z-index: 10;">${categoryTitle}</span>
              <div style="position: absolute; inset: 0; background: linear-gradient(to right, #facc15, #f59e0b); transform: skewX(-12deg);"></div>
            </h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
      `;

      categoryPages.forEach(page => {
        const pageDate = new Date(page.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        contentHTML += `
            <a href="${BASE_URL}${page.page_url}" style="display: flex; gap: 1rem; padding: 1rem; background-color: #f9fafb; border-radius: 0.5rem; text-decoration: none; transition: all 0.3s; border: 1px solid #e5e7eb;" onmouseover="this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1)'" onmouseout="this.style.boxShadow='none'">
              <div style="flex-shrink: 0; width: 8rem; height: 6rem; border-radius: 0.5rem; overflow: hidden;">
                ${page.cover_image
                  ? `<img src="${page.cover_image}" alt="${page.meta_title}" style="width: 100%; height: 100%; object-fit: cover;" />`
                  : `<div style="width: 100%; height: 100%; background: linear-gradient(to bottom right, #60a5fa, #22d3ee);"></div>`
                }
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; margin-bottom: 0.5rem;">
                  <span style="color: #60a5fa; font-weight: 600; text-transform: uppercase;">${pageData.category}</span>
                  <span style="color: #6b7280;">/</span>
                  <span style="color: #6b7280; display: flex; align-items: center; gap: 0.25rem;">
                    <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke-width="2"/>
                      <path stroke-linecap="round" d="M12 6v6l4 2" stroke-width="2"/>
                    </svg>
                    ${pageDate}
                  </span>
                </div>
                <h3 style="color: #111827; font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">${page.meta_title}</h3>
                ${page.meta_description ? `<p style="color: #6b7280; font-size: 0.875rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${page.meta_description}</p>` : ''}
              </div>
            </a>
        `;
      });

      contentHTML += `
          </div>
        </section>
      `;
    }
  }

  contentHTML += `
    </div>
  `;

  return contentHTML;
}

function generateStructuredData(pageData, topics) {
  const pageUrl = `${BASE_URL}${pageData.page_url}`;
  const topTopics = [...topics].sort((a, b) => b.search_volume - a.search_volume);

  const extractTopicType = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('trending topics')) {
      return title.replace(/trending topics/i, '').trim();
    }
    return title;
  };

  const topicType = extractTopicType(pageData.meta_title);
  const currentYear = new Date().getFullYear();
  const rankingTitle = `Top ${topTopics.length} ${topicType || 'Trending Topics'} (${currentYear})`;

  const description = pageData.meta_description;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": pageData.meta_title,
    "description": description,
    "url": pageUrl,
    "datePublished": pageData.created_at,
    "dateModified": new Date().toISOString(),
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": BASE_URL
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": pageData.meta_title,
          "item": pageUrl
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": rankingTitle,
      "description": pageData.intro_text || "Current trending topics ranked by search volume",
      "numberOfItems": topTopics.length,
      "itemListElement": topTopics.slice(0, 100).map((topic, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Thing",
          "name": topic.name.replace(/"/g, ''),
          "description": `${(topic.search_volume_raw || topic.search_volume).toString().replace(/"/g, '')} searches`
        }
      }))
    }
  };

  const navigationSchema = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    "name": "Main Navigation",
    "hasPart": [
      {
        "@type": "WebPage",
        "name": "Home",
        "url": `${BASE_URL}/`
      },
      {
        "@type": "WebPage",
        "name": "Trending Now",
        "url": `${BASE_URL}/trending-now/`
      }
    ]
  };

  return `<script type="application/ld+json">${JSON.stringify(webPageSchema)}</script>
<script type="application/ld+json">${JSON.stringify(navigationSchema)}</script>`;
}

async function prerenderExplorePage(baseHTML, distPath) {
  console.log('Pre-rendering: /explore');

  const { data: heroPage } = await supabase
    .from('pages')
    .select('*')
    .eq('display_section', 'hero')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: topPages } = await supabase
    .from('pages')
    .select('*')
    .eq('display_section', 'top')
    .order('created_at', { ascending: false })
    .limit(2);

  const { data: featuredPages } = await supabase
    .from('pages')
    .select('*')
    .eq('display_section', 'featured')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: popularPages } = await supabase
    .from('pages')
    .select('*')
    .eq('display_section', 'popular')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: latestPages } = await supabase
    .from('pages')
    .select('*')
    .neq('page_url', '/explore')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: topics } = await supabase
    .from('trending_topics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const exploreMetaTags = `
    <title>Top Best Charts - Explore Trending Topics and Data Visualizations</title>
    <meta name="description" content="Discover the latest trending topics and popular data visualizations across all categories. Explore rankings, charts, and real-time data insights." data-prerendered />
    <meta name="keywords" content="trending topics, data visualization, charts, explore topics, rankings, top charts, best charts" data-prerendered />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${BASE_URL}/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/" data-prerendered />
    <meta property="og:title" content="Top Best Charts - Explore Trending Topics and Data Visualizations" data-prerendered />
    <meta property="og:description" content="Discover the latest trending topics and popular data visualizations across all categories" data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="Top Best Charts - Explore Trending Topics and Data Visualizations" data-prerendered />
    <meta name="twitter:description" content="Discover the latest trending topics and popular data visualizations across all categories" data-prerendered />
  `;

  let exploreContentHTML = `
    <div class="explore-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <h1 style="color: #2563eb; font-size: 1.5rem; font-weight: 700; margin: 0;">Top Best Charts</h1>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <main style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
  `;

  // Hero and Top Pages Section
  if (heroPage || (topPages && topPages.length > 0)) {
    exploreContentHTML += `<section style="margin-bottom: 3rem;">`;

    if (heroPage) {
      exploreContentHTML += `
        <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin-bottom: 1.5rem;">
          <span style="color: #2563eb; font-size: 0.875rem; font-weight: 600; text-transform: uppercase;">Featured</span>
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0.5rem 0;">
            <a href="${BASE_URL}${heroPage.page_url}" style="text-decoration: none; color: inherit;">${heroPage.meta_title}</a>
          </h2>
          <p style="color: #4b5563; font-size: 0.875rem;">${heroPage.meta_description}</p>
        </article>
      `;
    }

    if (topPages && topPages.length > 0) {
      exploreContentHTML += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">`;
      topPages.forEach(page => {
        exploreContentHTML += `
          <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
            <span style="color: #059669; font-size: 0.875rem; font-weight: 600; text-transform: uppercase;">Top</span>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0.5rem 0;">
              <a href="${BASE_URL}${page.page_url}" style="text-decoration: none; color: inherit;">${page.meta_title}</a>
            </h3>
            <p style="color: #4b5563; font-size: 0.875rem;">${page.meta_description}</p>
          </article>
        `;
      });
      exploreContentHTML += `</div>`;
    }
    exploreContentHTML += `</section>`;
  }

  // Latest Pages Section
  if (latestPages && latestPages.length > 0) {
    exploreContentHTML += `
      <section style="margin-bottom: 3rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">LATEST</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
    `;
    latestPages.forEach(page => {
      const pageDate = new Date(page.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      exploreContentHTML += `
        <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; display: flex; gap: 1rem;">
          <div style="flex: 1;">
            <span style="color: #2563eb; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Page / ${pageDate}</span>
            <h3 style="font-size: 1.125rem; font-weight: 700; color: #111827; margin: 0.5rem 0;">
              <a href="${BASE_URL}${page.page_url}" style="text-decoration: none; color: inherit;">${page.meta_title}</a>
            </h3>
            ${page.meta_description ? `<p style="color: #4b5563; font-size: 0.875rem;">${page.meta_description}</p>` : ''}
          </div>
        </article>
      `;
    });
    exploreContentHTML += `</div></section>`;
  }

  // What Is Top Best Charts Section
  exploreContentHTML += `
    <section style="margin-bottom: 3rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h2 style="font-size: 2rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">What Is Top Best Charts?</h2>
        <p style="font-size: 1.125rem; color: #4b5563; margin-bottom: 1rem;">Your Ultimate Data Visualization Hub</p>
        <p style="color: #6b7280; max-width: 60rem; margin: 0 auto;">
          Top Best Charts helps you explore the world's top-ranked items quickly and visually. From rankings to insights,
          our platform makes data easy to understand and engaging for everyone.
        </p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Top List Rankings</h3>
          <p style="color: #6b7280; font-size: 0.875rem;">Browse the most popular items ranked by popularity, trends, and user engagement. Stay updated with what's trending now.</p>
        </div>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Bubble Chart Analysis</h3>
          <p style="color: #6b7280; font-size: 0.875rem;">Analyze trends with interactive bubble charts that reveal relationships between data points at a glance.</p>
        </div>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Bar Chart Comparisons</h3>
          <p style="color: #6b7280; font-size: 0.875rem;">Compare values side-by-side with clear bar charts that make differences and patterns easy to spot.</p>
        </div>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Donut Chart Proportions</h3>
          <p style="color: #6b7280; font-size: 0.875rem;">Explore proportions and distributions with elegant donut charts that highlight key segments.</p>
        </div>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Treemap Layout</h3>
          <p style="color: #6b7280; font-size: 0.875rem;">Understand hierarchical data with structured treemap layouts showing relationships and impact clearly.</p>
        </div>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">For Everyone</h3>
          <p style="color: #6b7280; font-size: 0.875rem;">Perfect for researchers, marketers, and enthusiasts. Your go-to destination for fast, intuitive, and visually stunning data exploration.</p>
        </div>
      </div>
    </section>
  `;

  // Category Topics Section
  if (topics && topics.length > 0) {
    const categoryTopics = {};
    topics.forEach(topic => {
      const category = topic.category || 'General';
      if (!categoryTopics[category]) {
        categoryTopics[category] = [];
      }
      if (categoryTopics[category].length < 3) {
        categoryTopics[category].push(topic);
      }
    });

    const categories = Object.entries(categoryTopics).slice(0, 3);
    categories.forEach(([category, categoryTopicsList]) => {
      exploreContentHTML += `
        <section style="margin-bottom: 3rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem; text-transform: uppercase;">${category}</h2>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
      `;
      categoryTopicsList.forEach(topic => {
        const searchVolume = topic.search_volume_raw || topic.search_volume;
        exploreContentHTML += `
          <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
            <div style="display: flex; gap: 1rem; align-items: flex-start;">
              <div style="flex: 1;">
                <span style="color: #2563eb; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">${category}</span>
                <h3 style="font-size: 1.125rem; font-weight: 700; color: #111827; margin: 0.5rem 0;">${topic.name.replace(/"/g, '')}</h3>
                <p style="color: #6b7280; font-size: 0.875rem;">${searchVolume.toString().replace(/"/g, '')} searches</p>
                ${topic.source ? `<span style="padding: 0.25rem 0.5rem; background-color: #e5e7eb; color: #4b5563; font-size: 0.75rem; border-radius: 0.25rem; display: inline-block; margin-top: 0.25rem;">${topic.source}</span>` : ''}
              </div>
            </div>
          </article>
        `;
      });
      exploreContentHTML += `</div></section>`;
    });
  }

  // Sidebar Sections (Featured and Popular)
  if ((featuredPages && featuredPages.length > 0) || (popularPages && popularPages.length > 0)) {
    exploreContentHTML += `<aside style="margin-top: 3rem;">`;

    if (featuredPages && featuredPages.length > 0) {
      exploreContentHTML += `
        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">FEATURED</h2>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
      `;
      featuredPages.forEach((page, index) => {
        exploreContentHTML += `
          <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
            <span style="color: #2563eb; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Featured #${index + 1}</span>
            <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0.5rem 0;">
              <a href="${BASE_URL}${page.page_url}" style="text-decoration: none; color: inherit;">${page.meta_title}</a>
            </h3>
            ${page.meta_description ? `<p style="color: #6b7280; font-size: 0.875rem;">${page.meta_description}</p>` : ''}
          </article>
        `;
      });
      exploreContentHTML += `</div></section>`;
    }

    if (popularPages && popularPages.length > 0) {
      exploreContentHTML += `
        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">POPULAR</h2>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
      `;
      popularPages.forEach((page, index) => {
        exploreContentHTML += `
          <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
            <span style="color: #db2777; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Popular #${index + 1}</span>
            <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0.5rem 0;">
              <a href="${BASE_URL}${page.page_url}" style="text-decoration: none; color: inherit;">${page.meta_title}</a>
            </h3>
            ${page.meta_description ? `<p style="color: #6b7280; font-size: 0.875rem;">${page.meta_description}</p>` : ''}
          </article>
        `;
      });
      exploreContentHTML += `</div></section>`;
    }

    exploreContentHTML += `</aside>`;
  }

  exploreContentHTML += `
      </main>
    </div>
  `;

  const html = baseHTML
    .replace(/<title>.*?<\/title>/, '')
    .replace('<!-- PRERENDER_META -->', exploreMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', '')
    .replace('<div id="root"></div>', `<div id="root">${exploreContentHTML}</div><div id="prerender-footer">${generateFooterHTML()}</div>`);

  fs.writeFileSync(path.join(distPath, 'index.html'), html);
  console.log('✓ Generated: /index.html');
}

async function prerenderTrendingNowPage(baseHTML, distPath) {
  console.log('Pre-rendering: /trending-now');

  const { data: topics } = await supabase
    .from('trending_topics')
    .select('*')
    .order('rank', { ascending: true })
    .limit(1000);

  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const topTopics = [...(topics || [])]
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 10)
    .map(t => t.name.replace(/"/g, ''))
    .join(', ');

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const homeMetaTags = `
    <title>Trending Now - Google Trending Topics Real-Time Visualization | ${currentDate}</title>
    <meta name="description" content="Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data. Top trending now: ${topTopics}. Updated hourly." data-prerendered />
    <meta name="keywords" content="google trends, trending topics, search trends, real-time trends, bubble chart, trend visualization, search volume, trending now, ${topTopics}" data-prerendered />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${BASE_URL}/trending-now/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/trending-now/" data-prerendered />
    <meta property="og:title" content="Trending Now - Google Trending Topics Real-Time Visualization" data-prerendered />
    <meta property="og:description" content="Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data. Updated hourly." data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="Trending Now - Google Trending Topics Real-Time Visualization" data-prerendered />
    <meta name="twitter:description" content="Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data. Updated hourly." data-prerendered />
  `;

  const homeStructuredData = `
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Trending Now - Google Trending Topics",
    "description": "Real-time trending topics visualization with interactive bubble charts",
    "url": "${BASE_URL}/trending-now/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "${BASE_URL}/trending-now/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }</script>
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    "name": "Main Navigation",
    "hasPart": [
      {
        "@type": "WebPage",
        "name": "Home",
        "url": "${BASE_URL}/"
      },
      {
        "@type": "WebPage",
        "name": "Trending Now",
        "url": "${BASE_URL}/trending-now/"
      }
    ]
  }</script>`;

  // Generate home page content HTML
  const topTopicsForDisplay = [...(topics || [])]
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 1000);

  const lastUpdated = (topics || []).length > 0
    ? new Date(Math.max(...(topics || []).map(t => new Date(t.pub_date || t.created_at || Date.now()).getTime())))
    : new Date();

  const formattedDate = lastUpdated.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  let homeContentHTML = `
    <div class="trending-now-page-content">
      <!-- Header Navigation for SEO -->
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <!-- Filter Menu for SEO -->
      <nav aria-label="Content filters" style="background-color: #f9fafb; padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb;">
        <div style="max-width: 80rem; margin: 0 auto;">
          <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; font-size: 0.875rem; color: #4b5563;">
            <span>View Modes:</span>
            <a href="?view=bubble" style="color: #93c5fd; text-decoration: none;">Bubble Chart</a>
            <a href="?view=bar" style="color: #93c5fd; text-decoration: none;">Bar Chart</a>
            <a href="?view=list" style="color: #93c5fd; text-decoration: none;">List View</a>
            <span style="margin-left: 1rem;">Filters:</span>
            <a href="?date=now" style="color: #93c5fd; text-decoration: none;">Trending Now</a>
            <a href="?date=24h" style="color: #93c5fd; text-decoration: none;">24 Hours</a>
            <a href="?date=week" style="color: #93c5fd; text-decoration: none;">Week</a>
            <a href="?date=month" style="color: #93c5fd; text-decoration: none;">Month</a>
            <a href="?date=year" style="color: #93c5fd; text-decoration: none;">Year</a>
            <a href="?date=all" style="color: #93c5fd; text-decoration: none;">All Time</a>
          </div>
        </div>
      </nav>

      <article style="max-width: 80rem; margin: 0 auto; padding: 0 0.5rem;">
        <header class="page-header" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 2rem; margin-top: 2rem;">
          <h1 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Trending Now</h1>
          <p style="color: #4b5563; font-size: 1rem; line-height: 1.625; margin-bottom: 1rem;">Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data.</p>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.875rem;">
            <time style="color: #6b7280;">
              Last updated: ${formattedDate} ET
            </time>
            <a href="#top-trending-heading" style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; background-color: #dbeafe; color: #1e40af; text-decoration: none; display: inline-block;">
              Top ${(topics || []).length} Google Trends
            </a>
          </div>
        </header>
      </article>

      <section class="top-topics-section">
        <h2>Top ${topTopicsForDisplay.length} Trending Now</h2>
        <ol class="topics-list">
  `;

  topTopicsForDisplay.forEach((topic, index) => {
    const searchVolume = topic.search_volume_raw || topic.search_volume;
    homeContentHTML += `
          <li>
            <span class="rank">${index + 1}</span>
            <div class="topic-info">
              <h3>${topic.name.replace(/"/g, '')}</h3>
              <p>${searchVolume.toString().replace(/"/g, '')} searches</p>
              ${topic.category ? `<span class="category">${topic.category}</span>` : ''}
            </div>
          </li>
    `;
  });

  homeContentHTML += `
        </ol>
      </section>
  `;

  if (pages && pages.length > 0) {
    // Featured Section
    homeContentHTML += `
      <section class="featured-pages-section" style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Featured</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
    `;

    pages.forEach((page) => {
      homeContentHTML += `
          <a href="${BASE_URL}${page.page_url}" style="text-decoration: underline; color: #60a5fa;">
            ${page.meta_title}
          </a>
      `;
    });

    homeContentHTML += `
        </div>
      </section>
    `;

    // Latest Section
    homeContentHTML += `
      <section class="latest-pages-section" style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Latest</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
    `;

    pages.forEach((page) => {
      homeContentHTML += `
          <article style="padding: 1rem; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">
              <a href="${BASE_URL}${page.page_url}" style="text-decoration: none; color: inherit;">
                ${page.meta_title}
              </a>
            </h3>
            <p style="color: #4b5563; font-size: 0.875rem;">${page.meta_description}</p>
          </article>
      `;
    });

    homeContentHTML += `
        </div>
      </section>
    `;
  }

  homeContentHTML += `
    </div>
  `;

  const html = baseHTML
    .replace(/<title>.*?<\/title>/, '')
    .replace('<!-- PRERENDER_META -->', homeMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', homeStructuredData)
    .replace('<div id="root"></div>', `<div id="root">${homeContentHTML}</div><div id="prerender-footer">${generateFooterHTML()}</div>`);

  const outputDir = path.join(distPath, 'trending-now');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log('✓ Generated: /trending-now/index.html');
}

async function prerenderContactPage(baseHTML, distPath) {
  console.log('Pre-rendering: /contact');

  const contactMetaTags = `
    <title>Contact Us - Top Best Charts</title>
    <meta name="description" content="Get in touch with Top Best Charts. Send us your questions, feedback, or suggestions." data-prerendered />
    <meta name="keywords" content="contact, get in touch, feedback, support" data-prerendered />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${BASE_URL}/contact/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/contact/" data-prerendered />
    <meta property="og:title" content="Contact Us - Top Best Charts" data-prerendered />
    <meta property="og:description" content="Get in touch with Top Best Charts. Send us your questions, feedback, or suggestions." data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="Contact Us - Top Best Charts" data-prerendered />
    <meta name="twitter:description" content="Get in touch with Top Best Charts. Send us your questions, feedback, or suggestions." data-prerendered />
  `;

  const contactContentHTML = `
    <div class="contact-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <main style="max-width: 60rem; margin: 2rem auto; padding: 0 1rem;">
        <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem;">
          <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem; text-align: center;">Get in Touch</h1>
          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin-bottom: 2rem; text-align: center;">
            Have a question or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>

          <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 2rem; text-align: center; margin: 2rem 0;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Email Us</h2>
            <p style="color: #4b5563; font-size: 1.125rem;">Kinh@phenu.com</p>
          </div>

          <p style="font-size: 1rem; line-height: 1.75; color: #6b7280; text-align: center; margin-top: 2rem;">
            We typically respond within 24 hours
          </p>
        </article>
      </main>
    </div>
  `;

  const html = baseHTML
    .replace(/<title>.*?<\/title>/, '')
    .replace('<!-- PRERENDER_META -->', contactMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', '')
    .replace('<div id="root"></div>', `<div id="root">${contactContentHTML}</div><div id="prerender-footer">${generateFooterHTML()}</div>`);

  const outputDir = path.join(distPath, 'contact');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log('✓ Generated: /contact/index.html');
}

async function prerenderInsightPage(baseHTML, distPath) {
  console.log('Pre-rendering: /insights');

  const insightMetaTags = `
    <title>Brand Keyword Insights - SEO Analysis Tool | Top Best Charts</title>
    <meta name="description" content="Upload and analyze brand keyword search volume data with interactive charts. Track SEO performance and keyword trends over time." data-prerendered />
    <meta name="keywords" content="keyword analysis, SEO tools, search volume, brand keywords, keyword tracking" data-prerendered />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${BASE_URL}/insights/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/insights/" data-prerendered />
    <meta property="og:title" content="Brand Keyword Insights - SEO Analysis Tool" data-prerendered />
    <meta property="og:description" content="Upload and analyze brand keyword search volume data with interactive charts" data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="Brand Keyword Insights - SEO Analysis Tool" data-prerendered />
    <meta name="twitter:description" content="Upload and analyze brand keyword search volume data with interactive charts" data-prerendered />
  `;

  const insightContentHTML = `
    <div class="insight-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/insights" style="color: #4b5563; text-decoration: none;">Insights</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <main style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
        <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem;">
          <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Brand Keyword Insights</h1>
          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin-bottom: 2rem;">
            Upload and analyze keyword search volume data for your brands. Track performance over time with interactive visualizations.
          </p>

          <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin: 2rem 0;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Features</h2>
            <ul style="color: #4b5563; font-size: 1rem; line-height: 1.75; list-style: disc; margin-left: 1.5rem;">
              <li>Upload CSV files with brand keyword data</li>
              <li>Visualize search volume trends over time</li>
              <li>Compare multiple brands side-by-side</li>
              <li>Track top performing keywords</li>
              <li>Export data for further analysis</li>
            </ul>
          </div>

          <p style="font-size: 1rem; line-height: 1.75; color: #6b7280; text-align: center; margin-top: 2rem;">
            Sign in to start analyzing your brand keywords
          </p>
        </article>
      </main>
    </div>
  `;

  const html = baseHTML
    .replace(/<title>.*?<\/title>/, '')
    .replace('<!-- PRERENDER_META -->', insightMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', '')
    .replace('<div id="root"></div>', `<div id="root">${insightContentHTML}</div><div id="prerender-footer">${generateFooterHTML()}</div>`);

  const outputDir = path.join(distPath, 'insights');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log('✓ Generated: /insights/index.html');
}

async function prerenderBrowseTopicsPage(baseHTML, distPath) {
  console.log('Pre-rendering: /browse-topics');

  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .not('category', 'is', null)
    .order('created_at', { ascending: false });

  const browseMetaTags = `
    <title>Browse Topics by Category - Top Best Charts</title>
    <meta name="description" content="Browse all topics and categories on Top Best Charts. Explore rankings, trends, and insights across various categories including AI, Markets, Technology, Gaming, and more." data-prerendered />
    <meta name="keywords" content="browse topics, categories, AI, markets, technology, gaming, trends, rankings, explore topics" data-prerendered />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${BASE_URL}/browse-topics/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/browse-topics/" data-prerendered />
    <meta property="og:title" content="Browse Topics by Category - Top Best Charts" data-prerendered />
    <meta property="og:description" content="Browse all topics and categories. Explore rankings and trends across AI, Markets, Technology, and more." data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="Browse Topics by Category - Top Best Charts" data-prerendered />
    <meta name="twitter:description" content="Browse all topics and categories. Explore rankings and trends across various categories." data-prerendered />
  `;

  let browseContentHTML = `
    <div class="browse-topics-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <main style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
        <div style="text-align: center; margin-bottom: 3rem;">
          <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Browse Topics</h1>
          <p style="font-size: 1.125rem; color: #4b5563;">Explore our collection of topics organized by category</p>
        </div>
  `;

  if (pages && pages.length > 0) {
    const categoryGroups = {};
    pages.forEach(page => {
      const category = page.category || 'Uncategorized';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(page);
    });

    const categories = Object.entries(categoryGroups).sort(([a], [b]) => a.localeCompare(b));

    categories.forEach(([category, categoryPages]) => {
      browseContentHTML += `
        <section style="margin-bottom: 3rem;">
          <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem; text-transform: uppercase;">${category}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
      `;

      categoryPages.forEach(page => {
        const pageDate = new Date(page.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        browseContentHTML += `
            <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden;">
              <div style="padding: 1.5rem;">
                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">
                  ${category} / ${pageDate}
                </div>
                <h3 style="font-size: 1.125rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">
                  <a href="${BASE_URL}${page.page_url}" style="text-decoration: none; color: inherit;">${page.meta_title}</a>
                </h3>
                ${page.meta_description ? `<p style="color: #6b7280; font-size: 0.875rem;">${page.meta_description}</p>` : ''}
              </div>
            </article>
        `;
      });

      browseContentHTML += `
          </div>
        </section>
      `;
    });
  } else {
    browseContentHTML += `
      <div style="text-align: center; padding: 3rem; color: #6b7280;">
        <p>No topics available yet.</p>
      </div>
    `;
  }

  browseContentHTML += `
      </main>
    </div>
  `;

  const html = baseHTML
    .replace(/<title>.*?<\/title>/, '')
    .replace('<!-- PRERENDER_META -->', browseMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', '')
    .replace('<div id="root"></div>', `<div id="root">${browseContentHTML}</div><div id="prerender-footer">${generateFooterHTML()}</div>`);

  const outputDir = path.join(distPath, 'browse-topics');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log('✓ Generated: /browse-topics/index.html');
}

async function prerenderAboutPage(baseHTML, distPath) {
  console.log('Pre-rendering: /about');

  const aboutMetaTags = `
    <title>About Us - Top Best Charts</title>
    <meta name="description" content="Learn about Top Best Charts, our mission to make data easy to understand, engaging, and visually stunning through interactive charts and rankings." data-prerendered />
    <meta name="keywords" content="about top best chart, data visualization, interactive charts, rankings, about us" data-prerendered />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${BASE_URL}/about/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/about/" data-prerendered />
    <meta property="og:title" content="About Us - Top Best Charts" data-prerendered />
    <meta property="og:description" content="Learn about Top Best Charts, our mission to make data easy to understand, engaging, and visually stunning through interactive charts and rankings." data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="About Us - Top Best Charts" data-prerendered />
    <meta name="twitter:description" content="Learn about Top Best Charts, our mission to make data easy to understand, engaging, and visually stunning through interactive charts and rankings." data-prerendered />
  `;

  const aboutContentHTML = `
    <div class="about-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <main style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
        <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem;">
          <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem;">About Us – Top Best Charts</h1>

          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin-bottom: 2rem;">
            At Top Best Charts, our mission is simple: to make data easy to understand, engaging, and visually stunning. We transform complex rankings and statistics into interactive charts and lists that anyone can explore, whether you're a researcher, marketer, student, or simply curious.
          </p>

          <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin: 2rem 0 1.5rem;">Our Platform Features</h2>

          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin-bottom: 2rem;">
            Our platform features a variety of tools to help you visualize and analyze data effectively:
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Top List</h3>
              <p style="color: #4b5563;">Quickly browse the highest-ranked items in a clean, easy-to-read format.</p>
            </div>
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Bubble Chart</h3>
              <p style="color: #4b5563;">Visualize trends and impact at a glance using scalable bubbles.</p>
            </div>
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Bar Chart</h3>
              <p style="color: #4b5563;">Compare items side-by-side with clarity and precision.</p>
            </div>
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Donut Chart</h3>
              <p style="color: #4b5563;">See proportional breakdowns in a modern, intuitive layout.</p>
            </div>
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Treemap</h3>
              <p style="color: #4b5563;">Explore hierarchical data with a clear and structured visual hierarchy.</p>
            </div>
          </div>

          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin: 2rem 0;">
            We believe that data should tell a story, not overwhelm you. That's why Top Best Charts combines simplicity, interactivity, and accuracy to help you discover patterns, trends, and insights across a wide range of topics.
          </p>

          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin: 2rem 0;">
            Whether you're tracking the most popular dog breeds, analyzing top salaries, or comparing products and trends, Top Best Charts turns raw numbers into actionable insights that are easy to understand and share.
          </p>

          <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin: 2rem 0 1.5rem;">Our Vision</h2>

          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin-bottom: 2rem;">
            Our vision is to be the go-to hub for anyone seeking the most popular, top-performing, or trend-setting items in the world, presented in a way that's both informative and visually engaging.
          </p>

          <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin: 2rem 0 1.5rem;">Our Commitment</h2>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; text-align: center;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Accuracy & Reliability</h3>
              <p style="color: #4b5563;">All data sources are carefully verified for accuracy and reliability.</p>
            </div>
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; text-align: center;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">User-Friendly Design</h3>
              <p style="color: #4b5563;">Clear, interactive, and mobile-friendly design for everyone.</p>
            </div>
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; text-align: center;">
              <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem;">Instant Insights</h3>
              <p style="color: #4b5563;">Helping our users make sense of the numbers in seconds.</p>
            </div>
          </div>

          <p style="font-size: 1.125rem; line-height: 1.75; color: #4b5563; margin: 2rem 0;">
            Join us in exploring the world's top charts, uncovering trends, and making data fun, intuitive, and meaningful.
          </p>

          <div style="background: linear-gradient(to right, #1e3a8a, #0f766e); border-radius: 0.5rem; padding: 2rem; text-align: center; margin-top: 3rem;">
            <p style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">
              Discover. Compare. Visualize.
            </p>
            <p style="font-size: 1.25rem; color: #93c5fd;">
              That's Top Best Charts.
            </p>
          </div>
        </article>
      </main>
    </div>
  `;

  const html = baseHTML
    .replace(/<title>.*?<\/title>/, '')
    .replace('<!-- PRERENDER_META -->', aboutMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', '')
    .replace('<div id="root"></div>', `<div id="root">${aboutContentHTML}</div><div id="prerender-footer">${generateFooterHTML()}</div>`);

  const outputDir = path.join(distPath, 'about');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log('✓ Generated: /about/index.html');
}

async function prerenderInsightsMetaPage(baseHTML, distPath) {
  console.log('Pre-rendering: /insights-meta');

  const insightsMetaMetaTags = `
    <title>Brand Insights Metadata - Data Quality & Statistics | Top Best Charts</title>
    <meta name="description" content="Browse metadata for all tracked brands. View data quality indicators, date ranges, and keyword statistics." data-prerendered />
    <meta name="keywords" content="brand insights, keyword metadata, data quality, SEO statistics, brand analysis" data-prerendered />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${BASE_URL}/insights-meta/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/insights-meta/" data-prerendered />
    <meta property="og:title" content="Brand Insights Metadata - Top Best Charts" data-prerendered />
    <meta property="og:description" content="Browse metadata for all tracked brands with data quality indicators" data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="Brand Insights Metadata - Top Best Charts" data-prerendered />
    <meta name="twitter:description" content="Browse metadata for all tracked brands with data quality indicators" data-prerendered />
  `;

  const insightsMetaContentHTML = `
    <div class="insights-meta-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/insights" style="color: #4b5563; text-decoration: none;">Insights</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <main style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
        <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem;">
          <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Brand Insights Metadata</h1>
        </article>
      </main>

      ${generateFooterHTML()}
    </div>
  `;

  const insightsMetaStructuredData = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Brand Insights Metadata",
      "description": "Browse metadata for all tracked brands with data quality indicators",
      "url": "${BASE_URL}/insights-meta/"
    }
    </script>
  `;

  let html = baseHTML
    .replace('<title>Vite + React + TS</title>', insightsMetaMetaTags)
    .replace('<div id="root"></div>', `<div id="root">${insightsMetaContentHTML}</div>`)
    .replace('</head>', `${insightsMetaStructuredData}</head>`);

  const insightsMetaDir = path.join(distPath, 'insights-meta');
  fs.mkdirSync(insightsMetaDir, { recursive: true });
  fs.writeFileSync(path.join(insightsMetaDir, 'index.html'), html);
  console.log('✓ Generated: /insights-meta/index.html');
}

async function prerenderCompetitorComparisonPage(baseHTML, distPath) {
  console.log('Pre-rendering: /insights/competitor-comparison');

  const competitorComparisonMetaTags = `
    <title>Compare Brands - Competitor Analysis | Top Best Charts</title>
    <meta name="description" content="Compare multiple brands side-by-side with detailed keyword performance metrics, search trends, and competitive insights." data-prerendered />
    <meta name="keywords" content="brand comparison, competitor analysis, keyword comparison, SEO comparison, brand metrics" data-prerendered />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${BASE_URL}/insights/competitor-comparison/" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}/insights/competitor-comparison/" data-prerendered />
    <meta property="og:title" content="Compare Brands - Competitor Analysis | Top Best Charts" data-prerendered />
    <meta property="og:description" content="Compare multiple brands side-by-side with detailed keyword performance metrics and competitive insights" data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="Compare Brands - Competitor Analysis | Top Best Charts" data-prerendered />
    <meta name="twitter:description" content="Compare multiple brands side-by-side with detailed keyword performance metrics" data-prerendered />
  `;

  const competitorComparisonContentHTML = `
    <div class="competitor-comparison-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <div style="background-color: #3b82f6; width: 2rem; height: 2rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 1.25rem;">📊</span>
            </div>
            <span style="font-size: 1.25rem; font-weight: bold; color: #1f2937;">Top Best Charts</span>
          </a>
        </nav>
      </header>
      <main style="min-height: 60vh; padding: 2rem 1rem;">
        <div style="max-width: 80rem; margin: 0 auto;">
          <div style="margin-bottom: 2rem;">
            <h1 style="font-size: 2rem; font-weight: bold; color: #1f2937; margin-bottom: 1rem;">Competitor Comparison</h1>
            <p style="font-size: 1.125rem; color: #6b7280;">Compare multiple brands side-by-side to analyze competitive positioning and keyword performance</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; text-align: center;">
            <p style="color: #6b7280; margin-bottom: 1rem;">Sign in to compare your brand data</p>
            <a href="${BASE_URL}/profile" style="display: inline-block; padding: 0.75rem 1.5rem; background-color: #3b82f6; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 500;">Sign In</a>
          </div>
        </div>
      </main>
    </div>
  `;

  const competitorComparisonStructuredData = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Compare Brands - Competitor Analysis",
      "description": "Compare multiple brands side-by-side with detailed keyword performance metrics",
      "url": "${BASE_URL}/insights/competitor-comparison/"
    }
    </script>
  `;

  const html = baseHTML
    .replace('<!-- PRERENDER_META -->', competitorComparisonMetaTags)
    .replace('<div id="root"></div>', `<div id="root">${competitorComparisonContentHTML}</div>`)
    .replace('</head>', `${competitorComparisonStructuredData}</head>`);

  const competitorComparisonDir = path.join(distPath, 'insights', 'competitor-comparison');
  fs.mkdirSync(competitorComparisonDir, { recursive: true });
  fs.writeFileSync(path.join(competitorComparisonDir, 'index.html'), html);
  console.log('✓ Generated: /insights/competitor-comparison/index.html');
}

async function prerenderBrandInsightPages(baseHTML, distPath) {
  console.log('Pre-rendering: Brand Insight Pages');

  // Fetch all public brand pages
  const { data: brandPages, error } = await supabase
    .from('brand_pages')
    .select('*')
    .eq('is_public', true);

  if (error) {
    console.error('Error fetching public brand pages:', error);
    return [];
  }

  if (!brandPages || brandPages.length === 0) {
    console.log('No public brand pages found');
    return [];
  }

  console.log(`Found ${brandPages.length} public brand pages to pre-render`);

  // Fetch all user profiles
  const userIds = [...new Set(brandPages.map(bp => bp.user_id))];
  const { data: userProfiles } = await supabase
    .from('user_profiles')
    .select('id, username')
    .in('id', userIds);

  const userProfileMap = new Map(userProfiles?.map(up => [up.id, up.username]) || []);

  for (const brandPage of brandPages) {
    const username = userProfileMap.get(brandPage.user_id);
    if (!username) {
      console.log(`Skipping ${brandPage.brand} - no username found`);
      continue;
    }

    const pageUrl = `/insights/${encodeURIComponent(username)}/${brandPage.page_id}/`;
    console.log(`Pre-rendering: ${pageUrl}`);

    // Fetch all keywords using pagination
    let keywordData = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('brand_keyword_data')
        .select('*')
        .eq('user_id', brandPage.user_id)
        .eq('brand', brandPage.brand)
        .order('"Avg. monthly searches"', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(`Error fetching keyword data for ${brandPage.brand}:`, error);
        break;
      }

      if (data && data.length > 0) {
        keywordData = [...keywordData, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Fetch monthly data
    const { data: monthlyData } = await supabase
      .from('brand_keyword_monthly_data')
      .select('*')
      .eq('user_id', brandPage.user_id)
      .eq('brand', brandPage.brand)
      .order('month', { ascending: false });

    // Fetch AI analysis
    const { data: aiAnalysis } = await supabase
      .from('brand_ai_analysis')
      .select('*')
      .eq('user_id', brandPage.user_id)
      .eq('brand', brandPage.brand)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const keywords = keywordData || [];
    const months = monthlyData || [];

    // Calculate stats
    const totalKeywords = keywords.length;
    const totalMonths = months.length;
    const avgVolume = keywords.length > 0
      ? Math.round(keywords.reduce((sum, k) => sum + (k['Avg. monthly searches'] || 0), 0) / keywords.length)
      : 0;

    console.log(`  Found ${totalKeywords} keywords, ${totalMonths} months for ${brandPage.brand}`);

    const topKeywords = keywords
      .slice(0, 10)
      .map(k => k.keyword)
      .join(', ');

    const enhancedTitle = brandPage.meta_title;
    const enhancedDescription = topKeywords
      ? `${brandPage.meta_description} Top keywords: ${topKeywords}. Track ${totalKeywords} keywords across ${totalMonths} months.`
      : brandPage.meta_description;

    const keywordsMetaTag = keywords.slice(0, 15).map(k => k.keyword).join(', ') + `, ${brandPage.brand}, search trends, keyword analysis, SEO insights`;

    const metaTags = `
    <title>${enhancedTitle}</title>
    <meta name="description" content="${enhancedDescription}" data-prerendered />
    <meta name="keywords" content="${keywordsMetaTag}" data-prerendered />
    <meta name="author" content="Top Best Charts" data-prerendered />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${BASE_URL}${pageUrl}" />

    <meta property="og:type" content="website" data-prerendered />
    <meta property="og:url" content="${BASE_URL}${pageUrl}" data-prerendered />
    <meta property="og:title" content="${enhancedTitle}" data-prerendered />
    <meta property="og:description" content="${enhancedDescription}" data-prerendered />
    <meta property="og:site_name" content="Top Best Charts" data-prerendered />
    ${brandPage.cover_image ? `<meta property="og:image" content="${brandPage.cover_image}" data-prerendered />` : ''}

    <meta name="twitter:card" content="summary_large_image" data-prerendered />
    <meta name="twitter:title" content="${enhancedTitle}" data-prerendered />
    <meta name="twitter:description" content="${enhancedDescription}" data-prerendered />
    ${brandPage.cover_image ? `<meta name="twitter:image" content="${brandPage.cover_image}" data-prerendered />` : ''}
  `;

    // Generate content HTML
    let contentHTML = `
    <div class="brand-insight-page-content">
      <header style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 0.5rem 1rem;">
        <nav aria-label="Main navigation" style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
          <a href="${BASE_URL}/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
            <span style="color: #2563eb; font-size: 1.5rem; font-weight: 700;">Top Best Charts</span>
          </a>
          <ul style="display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0;">
            <li><a href="${BASE_URL}/" style="color: #4b5563; text-decoration: none;">Home</a></li>
            <li><a href="${BASE_URL}/browse-topics" style="color: #4b5563; text-decoration: none;">Browse Topics</a></li>
            <li><a href="${BASE_URL}/trending-now" style="color: #4b5563; text-decoration: none;">Trending Now</a></li>
            <li><a href="${BASE_URL}/insights" style="color: #4b5563; text-decoration: none;">Insights</a></li>
            <li><a href="${BASE_URL}/contact" style="color: #4b5563; text-decoration: none;">Contact</a></li>
            <li><a href="${BASE_URL}/about" style="color: #4b5563; text-decoration: none;">About</a></li>
          </ul>
        </nav>
      </header>

      <main style="max-width: 80rem; margin: 2rem auto; padding: 0 1rem;">
        ${brandPage.cover_image ? `
        <div style="margin-bottom: 2rem;">
          <img src="${brandPage.cover_image}" alt="${brandPage.meta_title}" style="width: 100%; height: 24rem; object-fit: cover; border-radius: 0.5rem;" />
        </div>
        ` : ''}

        <article style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin-bottom: 2rem;">
          <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">${brandPage.meta_title}</h1>

          <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
            <div style="background-color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; flex: 1; min-width: 200px;">
              <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Total Keywords</p>
              <p style="color: #111827; font-size: 2rem; font-weight: 700;">${totalKeywords.toLocaleString()}</p>
            </div>
            <div style="background-color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; flex: 1; min-width: 200px;">
              <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Avg. Search Volume</p>
              <p style="color: #111827; font-size: 2rem; font-weight: 700;">${avgVolume.toLocaleString()}</p>
            </div>
            <div style="background-color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; flex: 1; min-width: 200px;">
              <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Months Tracked</p>
              <p style="color: #111827; font-size: 2rem; font-weight: 700;">${totalMonths}</p>
            </div>
          </div>

          ${brandPage.intro_text ? `
          <div style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Overview</h2>
            <div style="color: #4b5563; line-height: 1.75;">${brandPage.intro_text}</div>
          </div>
          ` : ''}

          ${brandPage.summary ? `
          <div style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Summary</h2>
            <div style="color: #4b5563; line-height: 1.75;">${brandPage.summary}</div>
          </div>
          ` : ''}
        </article>

        ${keywords.length > 0 ? `
        <section style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem;">Top ${keywords.length} Keywords for ${brandPage.brand}</h2>

          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 0.875rem; font-weight: 600; color: #4b5563; margin-bottom: 0.75rem;">Filter by Performance</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #2563eb; color: #111827; border: none;">All Keywords (${keywords.length})</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">🎯 Top 10 per Category</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">🔥 Ultra Growth</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">🚀 Extreme Growth</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">📈 High Growth</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">⭐ Rising Star</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">🎯 Great Potential</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">👑 High Value</button>
              <button style="padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; background-color: #e5e7eb; color: #4b5563; border: none;">⚡ Quick Win</button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #374151; background-color: rgba(55, 65, 81, 0.5);">
                  <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #4b5563;">#</th>
                  <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #4b5563;">Keyword</th>
                  <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #4b5563;">Volume</th>
                  <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #4b5563;">Sentiment</th>
                  <th style="padding: 0.75rem 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #4b5563;">Growth</th>
                </tr>
              </thead>
              <tbody>
                ${keywords.slice(0, 100).map((keyword, index) => {
                  const threeMonth = keyword['Three month change'] || 'N/A';
                  const yoy = keyword['YoY change'] || 'N/A';
                  const volume = keyword['Avg. monthly searches'] || 0;
                  const category = keyword.ai_category || '';
                  const competition = keyword.competition || 'N/A';
                  const bidHigh = keyword['Top of page bid (high range)'] || 0;
                  const sentimentScore = keyword.sentiment ? parseFloat(keyword.sentiment) : null;

                  let sentimentLabel = '';
                  let sentimentEmoji = '';
                  let sentimentColor = '#9ca3af';

                  if (sentimentScore !== null) {
                    if (sentimentScore >= 0.6) {
                      sentimentLabel = 'positive';
                      sentimentEmoji = '😊';
                      sentimentColor = '#10b981';
                    } else if (sentimentScore <= 0.4) {
                      sentimentLabel = 'negative';
                      sentimentEmoji = '😞';
                      sentimentColor = '#ef4444';
                    } else {
                      sentimentLabel = 'neutral';
                      sentimentEmoji = '😐';
                      sentimentColor = '#9ca3af';
                    }
                  }

                  return `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 0.75rem 0.5rem; color: #6b7280; font-weight: 600;">${index + 1}</td>
                    <td style="padding: 0.75rem 0.5rem;">
                      <div style="font-weight: 700; color: #111827; margin-bottom: 0.25rem;">${keyword.keyword}</div>
                      ${category ? `<span style="display: inline-block; padding: 0.125rem 0.5rem; background-color: #4b5563; color: #4b5563; border-radius: 0.25rem; font-size: 0.75rem;">${category}</span>` : ''}
                      <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">Comp: ${competition}${bidHigh > 0 ? ` • Bid: $${bidHigh.toFixed(2)}` : ''}</div>
                    </td>
                    <td style="padding: 0.75rem 0.5rem; color: #4b5563; font-weight: 600;">${volume.toLocaleString()}</td>
                    <td style="padding: 0.75rem 0.5rem;">
                      ${sentimentLabel ? `<div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: ${sentimentColor};">
                        <span style="font-size: 1rem;">${sentimentEmoji}</span>
                        <span style="text-transform: capitalize;">${sentimentLabel}</span>
                      </div>` : '<span style="color: #6b7280; font-size: 0.75rem;">-</span>'}
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      <div style="font-size: 0.75rem;">
                        <div style="color: ${threeMonth === 'N/A' ? '#9ca3af' : threeMonth.toString().startsWith('-') ? '#ef4444' : '#10b981'};">3mo: ${threeMonth}</div>
                        ${yoy !== 'N/A' ? `<div style="color: ${yoy.toString().startsWith('-') ? '#ef4444' : '#10b981'};">YoY: ${yoy}</div>` : ''}
                      </div>
                    </td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Search Volume Trends</h2>
          <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 2rem; text-align: center; color: #6b7280;">
            <p>Interactive chart showing keyword search volume trends over time.</p>
            <p style="margin-top: 0.5rem; font-size: 0.875rem;">Load the full page to view the interactive chart.</p>
          </div>
        </section>

        <section style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Top Keywords for Advertising</h2>
          ${(() => {
            const highValue = keywords.filter(k => (k['Avg. monthly searches'] || 0) > 1000 && (k['Top of page bid (high range)'] || 0) > 0)
              .sort((a, b) => (b['Avg. monthly searches'] || 0) * (b['Top of page bid (high range)'] || 0) - (a['Avg. monthly searches'] || 0) * (a['Top of page bid (high range)'] || 0))
              .slice(0, 10);

            return highValue.length > 0 ? `
            <div>
              <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">👑 Highest ROI Potential</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                ${highValue.map(k => `
                  <div style="background-color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; border: 1px solid #4b5563;">
                    <h4 style="color: #111827; font-weight: 600; margin-bottom: 0.5rem;">${k.keyword}</h4>
                    <div style="font-size: 0.75rem; color: #4b5563;">
                      <div>Volume: ${(k['Avg. monthly searches'] || 0).toLocaleString()}</div>
                      <div>CPC: $${(k['Top of page bid (low range)'] || 0).toFixed(2)} - $${(k['Top of page bid (high range)'] || 0).toFixed(2)}</div>
                      <div>Competition: ${k.competition || 'N/A'}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : '<p style="color: #6b7280;">No high-value keywords found.</p>';
          })()}
        </section>

        <section style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Summary and Analysis</h2>
          ${aiAnalysis && aiAnalysis.analysis ? `
            <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 0.5rem; padding: 2rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(96, 165, 250, 0.2);">
                <span style="font-size: 1.5rem;">✨</span>
                <div>
                  <p style="font-size: 0.875rem; color: #6b7280;">Generated analysis for ${brandPage.brand}</p>
                </div>
              </div>
              <div style="color: #4b5563; line-height: 1.75; font-size: 0.9375rem;">${convertMarkdownToHTML(aiAnalysis.analysis)}</div>
              ${aiAnalysis.model ? `
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(96, 165, 250, 0.2);">
                  <p style="font-size: 0.75rem; color: #6b7280;">Analysis generated using ${aiAnalysis.model} • ${new Date(aiAnalysis.created_at).toLocaleDateString()}</p>
                </div>
              ` : ''}
            </div>
          ` : `
            <div style="background-color: #e5e7eb; border-radius: 0.5rem; padding: 2rem; text-align: center;">
              <p style="color: #6b7280; margin-bottom: 1rem;">Get AI insights and recommendations for your keyword strategy.</p>
              <button style="padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; background: linear-gradient(to right, #2563eb, #7c3aed); color: #111827; border: none;">✨ Generate AI Insights</button>
            </div>
          `}
        </section>
        ` : ''}

        ${brandPage.faq ? `
        <section style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 2rem; margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Frequently Asked Questions</h2>
          <div style="color: #4b5563; line-height: 1.75;">${brandPage.faq}</div>
        </section>
        ` : ''}
      </main>

      ${generateFooterHTML()}
    </div>
  `;

    // Prepare trend data for structured data
    const trendDataPoints = months
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .map(m => ({
        date: m.month,
        volume: m.total_volume
      }));

    // Create keyword data for structured schema
    const keywordsList = keywords.slice(0, 20).map(k => ({
      name: k.keyword,
      searchVolume: k['Avg. monthly searches'] || 0,
      category: k.ai_category || 'Uncategorized',
      competition: k.competition || 'N/A'
    }));

    const structuredData = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${enhancedTitle.replace(/"/g, '\\"')}",
      "description": "${enhancedDescription.replace(/"/g, '\\"')}",
      "author": {
        "@type": "Organization",
        "name": "Top Best Charts"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Top Best Charts",
        "logo": {
          "@type": "ImageObject",
          "url": "${BASE_URL}/favicon.svg"
        }
      },
      "datePublished": "${brandPage.created_at}",
      "dateModified": "${brandPage.updated_at || brandPage.created_at}"
      ${brandPage.cover_image ? `,
      "image": "${brandPage.cover_image}"` : ''}
    }
    </script>
    ${trendDataPoints.length > 0 ? `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": "${brandPage.brand} Search Volume Trends",
      "description": "Monthly search volume trends for ${brandPage.brand} keywords showing ${totalMonths} months of data tracking ${totalKeywords} keywords.",
      "creator": {
        "@type": "Organization",
        "name": "Top Best Charts"
      },
      "datePublished": "${brandPage.created_at}",
      "dateModified": "${brandPage.updated_at || brandPage.created_at}",
      "keywords": "${keywords.slice(0, 10).map(k => k.keyword).join(', ')}",
      "temporalCoverage": "${trendDataPoints[0].date}/${trendDataPoints[trendDataPoints.length - 1].date}",
      "distribution": {
        "@type": "DataDownload",
        "encodingFormat": "application/json",
        "contentUrl": "${BASE_URL}${pageUrl}"
      },
      "variableMeasured": [
        {
          "@type": "PropertyValue",
          "name": "Search Volume",
          "description": "Total monthly search volume for tracked keywords",
          "unitText": "searches per month"
        }
      ],
      "temporalCoverage": "${trendDataPoints[0].date}/${trendDataPoints[trendDataPoints.length - 1].date}",
      "measurementTechnique": "Aggregated search volume data from Google Keyword Planner",
      "size": {
        "@type": "QuantitativeValue",
        "value": ${totalKeywords},
        "unitText": "keywords"
      }
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Top Keywords for ${brandPage.brand}",
      "description": "Top performing keywords ranked by search volume and growth",
      "numberOfItems": ${keywordsList.length},
      "itemListElement": [
        ${keywordsList.map((kw, idx) => `{
          "@type": "ListItem",
          "position": ${idx + 1},
          "item": {
            "@type": "Thing",
            "name": "${kw.name.replace(/"/g, '\\"')}",
            "description": "Search volume: ${kw.searchVolume.toLocaleString()} | Category: ${kw.category} | Competition: ${kw.competition}"
          }
        }`).join(',\n        ')}
      ]
    }
    </script>` : ''}
  `;

    let html = baseHTML
      .replace(/<title>.*?<\/title>/, '')
      .replace('<!-- PRERENDER_META -->', metaTags)
      .replace('<!-- PRERENDER_STRUCTURED_DATA -->', structuredData)
      .replace('<div id="root"></div>', `<div id="root">${contentHTML}</div>`);

    const pagePath = pageUrl.replace(/^\//, '');
    const outputDir = path.join(distPath, pagePath);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), html);

    console.log(`✓ Generated: ${outputDir}/index.html`);
  }

  return brandPages;
}

async function prerenderPages() {
  console.log('Starting pre-rendering process...');

  const pages = await fetchPages();
  console.log(`Found ${pages.length + 1} pages to pre-render`);

  const distPath = path.join(__dirname, '..', 'dist');
  const indexPath = path.join(distPath, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.error('Build output not found. Run `npm run build` first.');
    process.exit(1);
  }

  let baseHTML = fs.readFileSync(indexPath, 'utf-8');

  // Add scripts to baseHTML if not present
  if (!baseHTML.includes('sessionStorage.redirect')) {
    baseHTML = baseHTML.replace(
      '<body>',
      `<body>
    <script>
      // GitHub Pages SPA redirect handler
      (function() {
        var redirect = sessionStorage.redirect;
        delete sessionStorage.redirect;
        if (redirect && redirect != location.href) {
          history.replaceState(null, null, redirect);
        }
      })();

      // Remove trailing slashes to prevent duplicate URLs
      (function() {
        var path = window.location.pathname;
        if (path !== '/' && path.endsWith('/')) {
          var newUrl = window.location.origin + path.slice(0, -1) + window.location.search + window.location.hash;
          history.replaceState(null, null, newUrl);
        }
      })();
    </script>`
    );
  }

  await prerenderExplorePage(baseHTML, distPath);
  await prerenderTrendingNowPage(baseHTML, distPath);
  await prerenderBrowseTopicsPage(baseHTML, distPath);
  await prerenderContactPage(baseHTML, distPath);
  await prerenderInsightPage(baseHTML, distPath);
  await prerenderInsightsMetaPage(baseHTML, distPath);
  await prerenderCompetitorComparisonPage(baseHTML, distPath);
  await prerenderAboutPage(baseHTML, distPath);
  const brandPages = await prerenderBrandInsightPages(baseHTML, distPath);

  // Create redirect from /explore to /
  const exploreRedirectHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=/">
  <link rel="canonical" href="${BASE_URL}/" />
  <script>window.location.href = "/";</script>
  <title>Redirecting to Home...</title>
</head>
<body>
  <p>Redirecting to <a href="${BASE_URL}/">Home</a>...</p>
</body>
</html>`;
  const exploreDir = path.join(distPath, 'explore');
  fs.mkdirSync(exploreDir, { recursive: true });
  fs.writeFileSync(path.join(exploreDir, 'index.html'), exploreRedirectHTML);
  console.log('✓ Generated: /explore/index.html (redirect to /)');

  for (const page of pages) {
    // Skip explore page as it's handled separately
    if (page.page_url === '/explore') {
      continue;
    }

    console.log(`Pre-rendering: ${page.page_url}`);

    const topics = await fetchTopicsForPage(page.source);
    const sourceLabel = await getSourceLabel(page.source);

    const metaTags = generateMetaTags(page, topics);
    const contentHTML = await generateContentHTML(page, topics, sourceLabel);
    const structuredData = generateStructuredData(page, topics);

    let html = baseHTML
      .replace(/<title>.*?<\/title>/, '')
      .replace('<!-- PRERENDER_META -->', metaTags)
      .replace('<!-- PRERENDER_STRUCTURED_DATA -->', structuredData)
      .replace('<div id="root"></div>', `<div id="root">${contentHTML}</div><div id="prerender-footer">${generateFooterHTML()}</div>`);

    const pagePath = page.page_url.replace(/^\//, '').replace(/\/$/, '');
    const outputDir = path.join(distPath, pagePath);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), html);

    console.log(`✓ Generated: ${outputDir}/index.html`);
  }

  console.log('Pre-rendering complete!');

  // Generate sitemap
  await generateSitemap(pages, brandPages, distPath);
}

async function generateSitemap(pages, brandPages, distPath) {
  console.log('Generating sitemap...');

  const escapeXml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const today = new Date().toISOString().split('T')[0];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>${escapeXml(BASE_URL)}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${escapeXml(BASE_URL)}/trending-now/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${escapeXml(BASE_URL)}/browse-topics/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${escapeXml(BASE_URL)}/contact/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${escapeXml(BASE_URL)}/about/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${escapeXml(BASE_URL)}/insights/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${escapeXml(BASE_URL)}/insights-meta/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${escapeXml(BASE_URL)}/insights/competitor-comparison/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

  // Add all dynamic pages
  for (const page of pages) {
    const pageUrl = escapeXml(`${BASE_URL}${page.page_url}`);
    const lastmod = page.updated_at
      ? new Date(page.updated_at).toISOString().split('T')[0]
      : new Date(page.created_at).toISOString().split('T')[0];

    sitemap += `  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  // Add all brand insight pages
  if (brandPages && brandPages.length > 0) {
    // Fetch user profiles for brand pages
    const userIds = [...new Set(brandPages.map(bp => bp.user_id))];
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, username')
      .in('id', userIds);

    const userProfileMap = new Map(userProfiles?.map(up => [up.id, up.username]) || []);

    for (const brandPage of brandPages) {
      const username = userProfileMap.get(brandPage.user_id);
      if (!username) continue;

      const pageUrl = escapeXml(`${BASE_URL}/insights/${encodeURIComponent(username)}/${brandPage.page_id}/`);
      const lastmod = brandPage.updated_at
        ? new Date(brandPage.updated_at).toISOString().split('T')[0]
        : new Date(brandPage.created_at).toISOString().split('T')[0];

      sitemap += `  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
    }
  }

  sitemap += `</urlset>
`;

  // Write to dist folder with UTF-8 BOM for better compatibility
  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemap, 'utf8');
  console.log('✓ Generated: sitemap.xml');

  // Also update the public folder for development
  const publicPath = path.join(__dirname, '..', 'public');
  fs.writeFileSync(path.join(publicPath, 'sitemap.xml'), sitemap, 'utf8');
  console.log('✓ Updated: public/sitemap.xml');
}

prerenderPages().catch(console.error);
