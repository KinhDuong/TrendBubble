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
    .limit(100);

  if (error) {
    console.error('Error fetching topics:', error);
    return [];
  }

  return data || [];
}

function generateMetaTags(pageData, topics) {
  const topTopics = [...topics]
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 5)
    .map(t => t.name.replace(/"/g, ''))
    .join(', ');

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const lastUpdated = topics.length > 0
    ? new Date(Math.max(...topics.map(t => new Date(t.pub_date || t.created_at || Date.now()).getTime())))
    : new Date();

  const enhancedTitle = `${pageData.meta_title} - ${currentDate}`;
  const enhancedDescription = topTopics
    ? `${pageData.meta_description} Top trending: ${topTopics}. Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}.`
    : pageData.meta_description;

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

function generateContentHTML(pageData, topics) {
  const topTopics = [...topics]
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 10);

  const isCryptoPage = pageData.source === 'coingecko_crypto';

  let contentHTML = `
    <div class="dynamic-page-content">
      <h1>${pageData.meta_title}</h1>
      <p class="page-description">${pageData.meta_description}</p>
  `;

  if (pageData.summary) {
    contentHTML += `
      <section class="page-summary" aria-labelledby="page-summary" itemscope itemtype="https://schema.org/Article" style="max-width: 80rem; margin: 2rem auto 1.5rem; padding: 0 0.5rem;">
        <div class="summary-container" style="background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1.5rem;">
          <div class="summary-content" itemprop="articleBody" style="color: #d1d5db; line-height: 1.75; word-wrap: break-word; overflow-wrap: break-word;">
            ${pageData.summary}
          </div>
          <meta itemprop="author" content="Top Best Charts" />
          <meta itemprop="datePublished" content="${pageData.created_at}" />
        </div>
        <style>
          .page-summary h1, .page-summary h2, .page-summary h3 { color: #fff; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
          .page-summary h1 { font-size: 1.5rem; }
          .page-summary h2 { font-size: 1.25rem; }
          .page-summary h3 { font-size: 1.125rem; }
          .page-summary p { margin-bottom: 1rem; line-height: 1.75; font-size: 0.875rem; }
          .page-summary a { color: #60a5fa; text-decoration: none; word-break: break-word; }
          .page-summary a:hover { color: #93c5fd; }
          .page-summary ul, .page-summary ol { margin-left: 1.5rem; margin-bottom: 1rem; font-size: 0.875rem; }
          .page-summary li { margin-bottom: 0.5rem; }
          .page-summary strong { color: #fff; font-weight: 600; }
          .page-summary table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; overflow-x: auto; display: block; font-size: 0.875rem; }
          .page-summary th { background-color: #374151; color: #fff; padding: 0.5rem; border: 1px solid #4b5563; }
          .page-summary td { padding: 0.5rem; border: 1px solid #4b5563; }
          .page-summary img { max-width: 100%; height: auto; border-radius: 0.5rem; }
          .page-summary code { background-color: #374151; color: #d1d5db; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.75rem; word-break: break-word; }
          .page-summary pre { background-color: #111827; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
          .page-summary blockquote { border-left: 4px solid #4b5563; padding-left: 1rem; color: #9ca3af; margin: 1rem 0; }
          @media (min-width: 768px) {
            .page-summary { padding: 0; }
            .summary-container { padding: 1.5rem; }
            .page-summary p { font-size: 1rem; }
            .page-summary h1 { font-size: 2rem; }
            .page-summary h2 { font-size: 1.5rem; }
            .page-summary h3 { font-size: 1.25rem; }
            .page-summary ul, .page-summary ol, .page-summary table { font-size: 1rem; }
            .page-summary code { font-size: 0.875rem; }
          }
        </style>
      </section>
    `;
  }

  contentHTML += `
      <section class="top-topics">
        <h2>Top 10 ${isCryptoPage ? 'Gainers & Losers' : 'Trending Topics'}</h2>
        <ol class="topics-list">
  `;

  topTopics.forEach((topic, index) => {
    const searchVolume = topic.search_volume_raw || topic.search_volume;
    contentHTML += `
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

  contentHTML += `
        </ol>
      </section>
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

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${pageData.meta_title} - ${currentDate}`,
    "description": pageData.meta_description,
    "url": pageUrl,
    "datePublished": pageData.created_at,
    "dateModified": new Date().toISOString(),
    "mainEntity": {
      "@type": "ItemList",
      "name": "Top Trending Topics",
      "description": "Current trending topics ranked by search volume",
      "numberOfItems": topTopics.length,
      "itemListElement": topTopics.slice(0, 10).map((topic, index) => ({
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
    .limit(100);

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
    .slice(0, 10);

  let homeContentHTML = `
    <div class="home-page-content">
      <section class="hero-section">
        <h1>Google Trending Topics</h1>
        <p class="hero-description">Explore trending topics in real-time with interactive bubble charts. Watch search volumes grow and shrink with live Google Trends data.</p>
      </section>

      <section class="top-topics-section">
        <h2>Top 10 Trending Now</h2>
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
    homeContentHTML += `
      <section class="featured-pages-section">
        <h2>Latest Featured Topics</h2>
        <ul class="pages-list">
    `;

    pages.forEach((page) => {
      homeContentHTML += `
          <li>
            <a href="${page.page_url}">
              <h3>${page.meta_title}</h3>
              <p>${page.meta_description}</p>
            </a>
          </li>
      `;
    });

    homeContentHTML += `
        </ul>
      </section>
    `;
  }

  homeContentHTML += `
    </div>
  `;

  let html = baseHTML
    .replace('<title>Vite + React + TS</title>', '')
    .replace('<!-- PRERENDER_META -->', homeMetaTags)
    .replace('<!-- PRERENDER_STRUCTURED_DATA -->', homeStructuredData)
    .replace('<div id="root"></div>', `<div id="root">${homeContentHTML}</div>`);

  // Ensure GitHub Pages redirect script is present
  if (!html.includes('sessionStorage.redirect')) {
    html = html.replace(
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
    </script>`
    );
  }

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

  const baseHTML = fs.readFileSync(indexPath, 'utf-8');

  await prerenderHomePage(baseHTML, distPath);

  for (const page of pages) {
    console.log(`Pre-rendering: ${page.page_url}`);

    const topics = await fetchTopicsForPage(page.source);

    const metaTags = generateMetaTags(page, topics);
    const contentHTML = generateContentHTML(page, topics);
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
}

prerenderPages().catch(console.error);
