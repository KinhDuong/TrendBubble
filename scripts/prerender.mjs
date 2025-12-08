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

  const currentDate = lastUpdated.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

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

  const enhancedTitle = `${pageData.meta_title} - ${currentDate}`;

  let enhancedDescription = pageData.meta_description;
  if (pageData.intro_text) {
    enhancedDescription = `${pageData.intro_text} `;
  }
  if (topTopics) {
    enhancedDescription += `Top trending: ${topTopics}. Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}.`;
  }

  const keywords = topics.slice(0, 10).map(t => t.name.replace(/"/g, '')).join(', ') + ', trending topics, search trends, real-time trends, trend analysis';

  const pageUrl = `${BASE_URL}${pageData.page_url}`;

  return `
    <title>${enhancedTitle}</title>
    <meta name="description" content="${enhancedDescription}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${pageUrl}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${enhancedTitle}" />
    <meta property="og:description" content="${enhancedDescription}" />
    <meta property="og:site_name" content="Google Trending Topics" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${enhancedTitle}" />
    <meta name="twitter:description" content="${enhancedDescription}" />
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
    <article class="dynamic-page-article" style="max-width: 80rem; margin: 0 auto; padding: 0 0.5rem;">
      <header class="page-header" style="background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 2rem;">
        <h1 style="font-size: 1.875rem; font-weight: 700; color: white; margin-bottom: 0.75rem;">${pageData.meta_title}</h1>
        <p style="color: #d1d5db; font-size: 1rem; line-height: 1.625; margin-bottom: 1rem;">${pageData.meta_description}</p>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.875rem;">
          <time style="color: #9ca3af;">
            Last updated: ${formattedDate} ET
          </time>
          <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; background-color: rgba(30, 64, 175, 0.3); color: #93c5fd;">
            Top ${topics.length} ${sourceLabel}
          </span>
        </div>
      </header>
    </article>
  `;

  if (pageData.summary) {
    contentHTML += `
      <section class="page-summary" aria-labelledby="page-summary" itemscope itemtype="https://schema.org/Article" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 0.5rem;">
        <div class="summary-container" style="background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1.5rem;">
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
      <section class="page-faq" aria-labelledby="page-faq" itemscope itemtype="https://schema.org/FAQPage" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 0.5rem;">
        <div class="faq-container" style="background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1.5rem;">
          <div class="summary-content" itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
            ${pageData.faq}
          </div>
        </div>
      </section>
    `;
  }

  // Add topic rankings for SEO
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
      <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1.5rem;">
        <h2 id="top-trending-heading" style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: white;">
          ${rankingTitle}
        </h2>
        ${pageData.intro_text ? `<p style="color: #d1d5db; font-size: 0.875rem; line-height: 1.625; margin-bottom: 1rem;">${pageData.intro_text}</p>` : ''}
        <ol class="topics-list" style="list-style: none; padding: 0; margin: 0;">
  `;

  topTopics.forEach((topic, index) => {
    const searchVolume = topic.search_volume_raw || topic.search_volume;
    const rank = index + 1;
    contentHTML += `
          <li style="padding: 0.75rem 1rem; border-bottom: 1px solid #374151; display: flex; align-items: flex-start; gap: 0.75rem;" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <meta itemprop="position" content="${rank}" />
            <span style="color: #9ca3af; font-weight: 600; min-width: 2.5rem;">${rank}</span>
            <div style="flex: 1;" itemprop="item" itemscope itemtype="https://schema.org/Thing">
              <h3 style="font-size: 1rem; font-weight: 600; color: white; margin: 0 0 0.25rem 0;" itemprop="name">${topic.name.replace(/"/g, '')}</h3>
              <p style="color: #9ca3af; font-size: 0.875rem; margin: 0;" itemprop="description">${searchVolume.toString().replace(/"/g, '')}</p>
              ${topic.category ? `<span style="display: inline-block; margin-top: 0.25rem; padding: 0.125rem 0.5rem; background-color: #374151; color: #d1d5db; font-size: 0.75rem; border-radius: 0.25rem;">${topic.category}</span>` : ''}
            </div>
          </li>
    `;
  });

  contentHTML += `
        </ol>
      </div>
    </section>
  `;

  // Add Latest pages section for SEO
  const { data: latestPages } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (latestPages && latestPages.length > 0) {
    contentHTML += `
      <section class="latest-pages" aria-labelledby="latest-pages-heading" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 0.5rem;">
        <h2 id="latest-pages-heading" style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: white;">Latest</h2>
        <p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 1rem;">
          Explore the latest trending topics pages across different categories and sources. Stay informed with real-time updates on what's capturing attention and driving search volume across the internet.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
    `;

    latestPages.forEach(page => {
      const pageDate = new Date(page.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      contentHTML += `
          <a href="${page.page_url}" style="display: block; background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; overflow: hidden; text-decoration: none; transition: all 0.2s;">
            <div style="padding: 1rem;">
              <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">
                ${pageDate}
              </div>
              <h3 style="color: white; font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">${page.meta_title}</h3>
              <p style="color: #9ca3af; font-size: 0.875rem;">${page.meta_description}</p>
            </div>
          </a>
      `;
    });

    contentHTML += `
        </div>
      </section>
    `;
  }

  contentHTML += `
    </div>
  `;

  return contentHTML;
}

function generateStructuredData(pageData, topics) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
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

  const description = pageData.intro_text
    ? `${pageData.meta_description} ${pageData.intro_text}`
    : pageData.meta_description;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${pageData.meta_title} - ${currentDate}`,
    "description": description,
    "url": pageUrl,
    "datePublished": pageData.created_at,
    "dateModified": new Date().toISOString(),
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

  return `<script type="application/ld+json">${JSON.stringify(webPageSchema)}</script>`;
}

async function prerenderHomePage(baseHTML, distPath) {
  console.log('Pre-rendering home page...');

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
    <title>Google Trending Topics - Real-Time Bubble Chart Visualization | ${currentDate}</title>
    <meta name="description" content="Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data. Top trending now: ${topTopics}. Updated hourly." />
    <meta name="keywords" content="google trends, trending topics, search trends, real-time trends, bubble chart, trend visualization, search volume, trending now, ${topTopics}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${BASE_URL}/" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${BASE_URL}/" />
    <meta property="og:title" content="Google Trending Topics - Real-Time Bubble Chart Visualization" />
    <meta property="og:description" content="Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data. Updated hourly." />
    <meta property="og:site_name" content="Google Trending Topics" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Google Trending Topics - Real-Time Bubble Chart Visualization" />
    <meta name="twitter:description" content="Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data. Updated hourly." />
  `;

  const homeStructuredData = `<script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Google Trending Topics",
    "description": "Real-time trending topics visualization with interactive bubble charts",
    "url": "${BASE_URL}/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "${BASE_URL}/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
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
    <div class="home-page-content">
      <article style="max-width: 80rem; margin: 0 auto; padding: 0 0.5rem;">
        <header class="page-header" style="background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 2rem;">
          <h1 style="font-size: 1.875rem; font-weight: 700; color: white; margin-bottom: 0.75rem;">Google Trending Topics</h1>
          <p style="color: #d1d5db; font-size: 1rem; line-height: 1.625; margin-bottom: 1rem;">Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data.</p>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.875rem;">
            <time style="color: #9ca3af;">
              Last updated: ${formattedDate} ET
            </time>
            <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; background-color: rgba(30, 64, 175, 0.3); color: #93c5fd;">
              Top ${(topics || []).length} Google Trends
            </span>
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
          <a href="${page.page_url}" style="text-decoration: underline; color: #60a5fa;">
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
          <article style="padding: 1rem; background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: white; margin-bottom: 0.5rem;">
              <a href="${page.page_url}" style="text-decoration: none; color: inherit;">
                ${page.meta_title}
              </a>
            </h3>
            <p style="color: #d1d5db; font-size: 0.875rem;">${page.meta_description}</p>
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
    .replace('<title>Vite + React + TS</title>', '')
    .replace('<!-- PRERENDER_META -->', homeMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', homeStructuredData)
    .replace('<div id="root"></div>', `<div id="root">${homeContentHTML}</div>`);

  fs.writeFileSync(path.join(distPath, 'index.html'), html);
  console.log('✓ Generated: /index.html');
}

async function prerenderPages() {
  console.log('Starting pre-rendering process...');

  const pages = await fetchPages();
  console.log(`Found ${pages.length} pages to pre-render`);

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

  await prerenderHomePage(baseHTML, distPath);

  for (const page of pages) {
    console.log(`Pre-rendering: ${page.page_url}`);

    const topics = await fetchTopicsForPage(page.source);
    const sourceLabel = await getSourceLabel(page.source);

    const metaTags = generateMetaTags(page, topics);
    const contentHTML = await generateContentHTML(page, topics, sourceLabel);
    const structuredData = generateStructuredData(page, topics);

    let html = baseHTML
      .replace('<title>Vite + React + TS</title>', '')
      .replace('<!-- PRERENDER_META -->', metaTags)
      .replace('<!-- PRERENDER_STRUCTURED_DATA -->', structuredData)
      .replace('<div id="root"></div>', `<div id="root">${contentHTML}</div>`);

    const pagePath = page.page_url.replace(/^\//, '');
    const outputDir = path.join(distPath, pagePath);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), html);

    console.log(`✓ Generated: ${outputDir}/index.html`);
  }

  console.log('Pre-rendering complete!');

  // Generate sitemap
  await generateSitemap(pages, distPath);
}

async function generateSitemap(pages, distPath) {
  console.log('Generating sitemap...');

  const today = new Date().toISOString().split('T')[0];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // Add all dynamic pages
  for (const page of pages) {
    const pageUrl = `${BASE_URL}${page.page_url}`;
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

  sitemap += `</urlset>
`;

  // Write to dist folder
  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemap);
  console.log('✓ Generated: sitemap.xml');

  // Also update the public folder for development
  const publicPath = path.join(__dirname, '..', 'public');
  fs.writeFileSync(path.join(publicPath, 'sitemap.xml'), sitemap);
  console.log('✓ Updated: public/sitemap.xml');
}

prerenderPages().catch(console.error);
