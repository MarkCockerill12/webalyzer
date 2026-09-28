import { TechCategory } from '../types';

/**
 * Data-driven technology fingerprints (Wappalyzer-style).
 * A capture group 1 in any regex is treated as the version string.
 *
 *  html    - tested against the static + browser-rendered HTML
 *  scripts - tested against <script src> / loaded script URLs
 *  code    - tested against downloaded JS bundle contents (weakest signal)
 *  headers - header name -> regex on value (use /./ or /(?:)/ for presence)
 *  cookies - tested against cookie names
 *  meta    - <meta name="..."> -> regex on content (generator etc.)
 *  js      - expression evaluated in the rendered page (`w` = window); a string/number result is the version
 *  url     - tested against the final URL
 */
export interface TechSignature {
  name: string;
  category: TechCategory;
  description: string;
  html?: RegExp[];
  scripts?: RegExp[];
  code?: RegExp[];
  headers?: Record<string, RegExp>;
  cookies?: RegExp[];
  meta?: Record<string, RegExp>;
  js?: string;
  url?: RegExp;
  implies?: string[];
}

const ANY = /(?:)/;

export const TECH_SIGNATURES: TechSignature[] = [
  // ---------- Frontend frameworks ----------
  {
    name: 'React', category: 'Frontend Framework', description: 'JavaScript UI library by Meta',
    html: [/data-reactroot/, /data-reactid/],
    scripts: [/react(?:-dom)?(?:\.production)?(?:\.min)?\.js/i, /\/react(?:-dom)?@([\d.]+)/],
    code: [/react-dom\.production|__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED|react\.dev\/errors|reactjs\.org\/docs\/error-decoder/],
    js: `(w.React && w.React.version) || Array.from(document.querySelectorAll('body *')).slice(0, 400).some(e => Object.keys(e).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactContainer') || k.startsWith('_reactRootContainer')))`,
  },
  {
    name: 'Next.js', category: 'Frontend Framework', description: 'React framework for SSR / SSG',
    html: [/<script[^>]+id="__NEXT_DATA__"/, /\/_next\/static\//, /self\.__next_f/],
    headers: { 'x-powered-by': /Next\.js ?([\d.]+)?/i, 'x-nextjs-cache': ANY, 'x-nextjs-prerender': ANY, 'x-nextjs-matched-path': ANY },
    js: `(w.next && w.next.version) || !!w.__NEXT_DATA__`,
    implies: ['React'],
  },
  {
    name: 'Gatsby', category: 'Frontend Framework', description: 'React static site generator',
    html: [/id="___gatsby"/],
    meta: { generator: /Gatsby ([\d.]+)/ },
    js: `!!w.___gatsby`,
    implies: ['React'],
  },
  {
    name: 'Remix', category: 'Frontend Framework', description: 'Full-stack React framework',
    html: [/window\.__remixContext/],
    js: `!!w.__remixContext`,
    implies: ['React'],
  },
  {
    name: 'Vue.js', category: 'Frontend Framework', description: 'Progressive JavaScript framework',
    html: [/\sdata-v-[0-9a-f]{8}\b/, /\sdata-v-app\b/],
    scripts: [/vue(?:\.runtime)?(?:\.global)?(?:\.prod)?(?:\.min)?\.js/i, /\/vue@([\d.]+)/],
    js: `(w.Vue && w.Vue.version) || (document.querySelector('[data-v-app]') && document.querySelector('[data-v-app]').__vue_app__ && document.querySelector('[data-v-app]').__vue_app__.version) || Array.from(document.querySelectorAll('body > *')).some(e => e.__vue__ || e.__vue_app__)`,
  },
  {
    name: 'Nuxt.js', category: 'Frontend Framework', description: 'Vue framework for SSR / SSG',
    html: [/\/_nuxt\//, /window\.__NUXT__/, /id="__nuxt"/],
    headers: { 'x-powered-by': /Nuxt/i },
    js: `!!(w.__NUXT__ || w.$nuxt || w.useNuxtApp)`,
    implies: ['Vue.js'],
  },
  {
    name: 'Angular', category: 'Frontend Framework', description: 'TypeScript web framework by Google',
    html: [/ng-version="([\d.]+)"/],
    js: `document.querySelector('[ng-version]') && document.querySelector('[ng-version]').getAttribute('ng-version')`,
  },
  {
    name: 'AngularJS', category: 'Frontend Framework', description: 'Legacy Angular 1.x framework (end-of-life)',
    html: [/\sng-app(?:=|\s|>)/],
    scripts: [/angular(?:\.min)?\.js/i],
    js: `w.angular && w.angular.version && w.angular.version.full`,
  },
  {
    name: 'Svelte', category: 'Frontend Framework', description: 'Compiled UI framework',
    html: [/class="[^"]*\bsvelte-[a-z0-9]{5,}\b/],
  },
  {
    name: 'SvelteKit', category: 'Frontend Framework', description: 'Svelte application framework',
    html: [/__sveltekit_|data-sveltekit-/],
    implies: ['Svelte'],
  },
  {
    name: 'Astro', category: 'Frontend Framework', description: 'Content-focused islands framework',
    html: [/<astro-island|data-astro-cid-/],
    meta: { generator: /Astro v?([\d.]+)/ },
  },
  {
    name: 'Ember.js', category: 'Frontend Framework', description: 'Opinionated JavaScript framework',
    html: [/id="ember\d+"/],
    js: `w.Ember && w.Ember.VERSION`,
  },
  {
    name: 'Alpine.js', category: 'Frontend Framework', description: 'Lightweight reactive framework',
    html: [/\sx-data=/],
    js: `w.Alpine && (w.Alpine.version || true)`,
  },
  {
    name: 'htmx', category: 'Frontend Framework', description: 'HTML-over-the-wire interactivity',
    html: [/\shx-(?:get|post|put|delete|target)=/],
    js: `w.htmx && (w.htmx.version || true)`,
  },
  {
    name: 'jQuery', category: 'Build Tool / Lib', description: 'Classic DOM manipulation library',
    scripts: [/jquery[.-]([\d.]+)(?:\.min)?\.js/i, /jquery(?:\.min)?\.js/i, /\/jquery@([\d.]+)/],
    js: `w.jQuery && w.jQuery.fn && w.jQuery.fn.jquery`,
  },
  {
    name: 'Three.js', category: 'Build Tool / Lib', description: '3D WebGL graphics library',
    scripts: [/three(?:\.module)?(?:\.min)?\.js/i, /\/three@([\d.]+)/],
    code: [/__THREE__/],
    js: `w.THREE && w.THREE.REVISION ? 'r' + w.THREE.REVISION : w.__THREE__ ? 'r' + w.__THREE__ : false`,
  },
  {
    name: 'GSAP', category: 'Build Tool / Lib', description: 'GreenSock animation platform',
    scripts: [/gsap(?:\.min)?\.js/i, /\/gsap@([\d.]+)/],
    js: `w.gsap && (w.gsap.version || true)`,
  },
  {
    name: 'Webpack', category: 'Build Tool / Lib', description: 'JavaScript module bundler',
    code: [/__webpack_require__|webpackChunk/],
    js: `Object.keys(w).some(k => k.startsWith('webpackChunk')) || !!w.webpackJsonp`,
  },
  {
    name: 'Vite', category: 'Build Tool / Lib', description: 'Frontend build tool',
    html: [/\/@vite\/client/, /<script[^>]+type="module"[^>]+src="[^"]*\/assets\/[\w-]+-[\w-]{8}\.js"/],
    code: [/__vite__mapDeps|__vitePreload|vite\/modulepreload-polyfill/],
  },
  {
    name: 'Lodash', category: 'Build Tool / Lib', description: 'JavaScript utility library',
    js: `w._ && w._.VERSION && typeof w._.chunk === 'function' && w._.VERSION`,
  },
  {
    name: 'Moment.js', category: 'Build Tool / Lib', description: 'Date library (legacy, in maintenance mode)',
    js: `w.moment && w.moment.version`,
  },

  // ---------- CSS ----------
  {
    name: 'Tailwind CSS', category: 'CSS Framework', description: 'Utility-first CSS framework',
    html: [/--tw-(?:ring|shadow|translate|rotate|scale)/, /class="[^"]*\b(?:sm|md|lg|xl|2xl):(?:flex|grid|hidden|block|px-|py-|text-|w-)/],
  },
  {
    name: 'Bootstrap', category: 'CSS Framework', description: 'Responsive CSS / JS toolkit',
    html: [/bootstrap(?:\.bundle)?(?:\.min)?\.(?:css|js)/i, /bootstrap@([\d.]+)/],
    js: `w.bootstrap && w.bootstrap.Tooltip && w.bootstrap.Tooltip.VERSION`,
  },
  { name: 'Font Awesome', category: 'CSS Framework', description: 'Icon toolkit', html: [/font-?awesome/i, /kit\.fontawesome\.com/] },
  { name: 'Google Fonts', category: 'CSS Framework', description: 'Hosted web fonts', html: [/fonts\.(?:googleapis|gstatic)\.com/] },

  // ---------- CMS / platforms ----------
  {
    name: 'WordPress', category: 'CMS / Platform', description: 'PHP content management system',
    html: [/\/wp-content\//, /\/wp-includes\//],
    meta: { generator: /WordPress ?([\d.]+)?/ },
    headers: { link: /api\.w\.org/ },
    js: `!!(w.wp && w.wp.hooks) || !!w.wpApiSettings`,
    implies: ['PHP'],
  },
  { name: 'WooCommerce', category: 'E-commerce', description: 'WordPress e-commerce plugin', html: [/\/plugins\/woocommerce\/|\bwoocommerce-(?:page|js|no-js)\b/], meta: { generator: /WooCommerce ([\d.]+)/ }, implies: ['WordPress'] },
  {
    name: 'Drupal', category: 'CMS / Platform', description: 'PHP content management system',
    html: [/\/sites\/default\/files\//, /drupal-settings-json/],
    meta: { generator: /Drupal ?(\d+)?/ },
    headers: { 'x-generator': /Drupal ?(\d+)?/, 'x-drupal-cache': ANY, 'x-drupal-dynamic-cache': ANY },
    js: `!!w.Drupal`,
    implies: ['PHP'],
  },
  { name: 'Joomla', category: 'CMS / Platform', description: 'PHP content management system', meta: { generator: /Joomla!?/ }, html: [/\/media\/jui\//], implies: ['PHP'] },
  { name: 'Ghost', category: 'CMS / Platform', description: 'Node.js publishing platform', meta: { generator: /Ghost ([\d.]+)/ } },
  { name: 'Hugo', category: 'CMS / Platform', description: 'Go static site generator', meta: { generator: /Hugo ([\d.]+)/ } },
  { name: 'Jekyll', category: 'CMS / Platform', description: 'Ruby static site generator', meta: { generator: /Jekyll v?([\d.]+)/ } },
  { name: 'Docusaurus', category: 'CMS / Platform', description: 'Documentation site generator', meta: { generator: /Docusaurus v?([\d.]+)/ }, implies: ['React'] },
  {
    name: 'Webflow', category: 'CMS / Platform', description: 'Visual website builder',
    html: [/data-wf-page=/, /webflow\.js/], meta: { generator: /Webflow/ },
  },
  {
    name: 'Wix', category: 'CMS / Platform', description: 'Hosted website builder',
    html: [/static\.wixstatic\.com/, /static\.parastorage\.com/], headers: { 'x-wix-request-id': ANY }, meta: { generator: /Wix\.com/ },
  },
  {
    name: 'Squarespace', category: 'CMS / Platform', description: 'Hosted website builder',
    html: [/static1\.squarespace\.com|squarespace-cdn\.com/], js: `!!(w.Static && w.Static.SQUARESPACE_CONTEXT)`,
  },
  {
    name: 'Shopify', category: 'E-commerce', description: 'Hosted e-commerce platform',
    html: [/cdn\.shopify\.com/], headers: { 'x-shopid': ANY, 'x-shopify-stage': ANY }, js: `!!w.Shopify`,
  },
  { name: 'Magento', category: 'E-commerce', description: 'PHP e-commerce platform', html: [/Mage\.Cookies|\/static\/version\d+\/frontend\//], cookies: [/^X-Magento-Vary$/], implies: ['PHP'] },
  {
    name: 'Microsoft SharePoint', category: 'CMS / Platform', description: 'Enterprise collaboration platform',
    headers: { microsoftsharepointteamservices: /([\d.]+)/, 'x-sharepointhealthscore': ANY, sprequestguid: ANY },
    html: [/_layouts\/15\//],
    js: `!!w._spPageContextInfo`,
  },

  // ---------- Backend / languages ----------
  {
    name: 'PHP', category: 'Backend / Language', description: 'Server-side scripting language',
    headers: { 'x-powered-by': /PHP\/?([\d.]+)?/i }, cookies: [/^PHPSESSID$/],
  },
  { name: 'Laravel', category: 'Backend / Language', description: 'PHP web framework', cookies: [/^laravel_session$/], implies: ['PHP'] },
  {
    name: 'ASP.NET', category: 'Backend / Language', description: 'Microsoft web framework',
    headers: { 'x-aspnet-version': /(.+)/, 'x-powered-by': /ASP\.NET/, 'x-aspnetmvc-version': ANY },
    cookies: [/^ASP\.NET_SessionId$/, /^\.AspNetCore\./, /^\.ASPXAUTH$/],
    html: [/__VIEWSTATE/],
  },
  { name: 'Express', category: 'Backend / Language', description: 'Node.js web framework', headers: { 'x-powered-by': /^Express$/i }, implies: ['Node.js'] },
  { name: 'Node.js', category: 'Backend / Language', description: 'Server-side JavaScript runtime', cookies: [/^connect\.sid$/] },
  { name: 'Ruby on Rails', category: 'Backend / Language', description: 'Ruby web framework', html: [/content="authenticity_token"/], headers: { 'x-powered-by': /Phusion Passenger/ } },
  { name: 'Django', category: 'Backend / Language', description: 'Python web framework', html: [/name="csrfmiddlewaretoken"/], cookies: [/^django_language$/] },
  { name: 'Java', category: 'Backend / Language', description: 'JVM application server', cookies: [/^JSESSIONID$/] },
  {
    name: 'Google Firebase', category: 'Database', description: 'Google backend-as-a-service',
    html: [/firebaseio\.com|firebaseapp\.com/], code: [/firebaseio\.com|firebaseapp\.com|firestore\.googleapis\.com/],
    js: `w.firebase && (w.firebase.SDK_VERSION || true)`,
  },
  { name: 'Supabase', category: 'Database', description: 'Postgres backend-as-a-service', html: [/\.supabase\.co\b/], code: [/\.supabase\.co\b/] },

  // ---------- Web servers ----------
  { name: 'Nginx', category: 'Web Server', description: 'High-performance web server / reverse proxy', headers: { server: /nginx(?:\/([\d.]+))?/i } },
  { name: 'OpenResty', category: 'Web Server', description: 'Nginx + Lua platform', headers: { server: /openresty(?:\/([\d.]+))?/i } },
  { name: 'Apache HTTP Server', category: 'Web Server', description: 'Apache web server', headers: { server: /Apache(?:\/([\d.]+))?(?!-Coyote)/ } },
  { name: 'Microsoft IIS', category: 'Web Server', description: 'Windows web server', headers: { server: /Microsoft-IIS(?:\/([\d.]+))?/ } },
  { name: 'LiteSpeed', category: 'Web Server', description: 'LiteSpeed web server', headers: { server: /LiteSpeed/i } },
  { name: 'Caddy', category: 'Web Server', description: 'Go web server with automatic HTTPS', headers: { server: /Caddy/ } },
  { name: 'Envoy', category: 'Web Server', description: 'Cloud-native proxy', headers: { server: /envoy/, 'x-envoy-upstream-service-time': ANY } },
  { name: 'Varnish', category: 'Web Server', description: 'HTTP cache', headers: { via: /varnish/i, 'x-varnish': ANY } },

  // ---------- CDN / hosting ----------
  { name: 'Cloudflare', category: 'CDN / Hosting', description: 'CDN, DNS and edge network', headers: { server: /cloudflare/i, 'cf-ray': ANY, 'cf-cache-status': ANY } },
  { name: 'Vercel', category: 'CDN / Hosting', description: 'Frontend cloud platform', headers: { server: /Vercel/i, 'x-vercel-id': ANY, 'x-vercel-cache': ANY }, url: /\.vercel\.app/ },
  { name: 'Netlify', category: 'CDN / Hosting', description: 'Web hosting platform', headers: { server: /Netlify/i, 'x-nf-request-id': ANY }, url: /\.netlify\.app/ },
  { name: 'GitHub Pages', category: 'CDN / Hosting', description: 'Static hosting by GitHub', headers: { server: /GitHub\.com/ }, url: /\.github\.io/ },
  { name: 'Amazon CloudFront', category: 'CDN / Hosting', description: 'AWS CDN', headers: { via: /CloudFront/i, 'x-amz-cf-id': ANY, 'x-amz-cf-pop': ANY } },
  { name: 'Amazon S3', category: 'CDN / Hosting', description: 'AWS object storage', headers: { server: /AmazonS3/, 'x-amz-bucket-region': ANY } },
  { name: 'AWS Elastic Load Balancing', category: 'CDN / Hosting', description: 'AWS load balancer', headers: { server: /awselb/i }, cookies: [/^AWSALB/] },
  { name: 'Fastly', category: 'CDN / Hosting', description: 'Edge cloud / CDN', headers: { 'x-fastly-request-id': ANY, 'x-served-by': /^cache-[a-z]{3}/i, 'fastly-restarts': ANY } },
  { name: 'Akamai', category: 'CDN / Hosting', description: 'CDN and edge security', headers: { server: /AkamaiGHost|AkamaiNetStorage/, 'x-akamai-transformed': ANY, 'akamai-grn': ANY } },
  { name: 'Microsoft Azure', category: 'CDN / Hosting', description: 'Microsoft cloud platform', headers: { 'x-azure-ref': ANY, 'x-msedge-ref': ANY }, url: /\.azurewebsites\.net|\.azurestaticapps\.net/ },
  { name: 'Google Cloud', category: 'CDN / Hosting', description: 'Google Cloud Platform', headers: { server: /Google Frontend/, 'x-goog-generation': ANY, 'x-cloud-trace-context': ANY }, url: /\.run\.app|\.appspot\.com/ },
  { name: 'Heroku', category: 'CDN / Hosting', description: 'Platform-as-a-service', headers: { via: /vegur/i }, url: /\.herokuapp\.com/ },
  { name: 'Fly.io', category: 'CDN / Hosting', description: 'Edge application platform', headers: { server: /^Fly\//, 'fly-request-id': ANY }, url: /\.fly\.dev/ },
  { name: 'Render', category: 'CDN / Hosting', description: 'Cloud application hosting', headers: { 'x-render-origin-server': ANY }, url: /\.onrender\.com/ },
  { name: 'Railway', category: 'CDN / Hosting', description: 'Cloud application hosting', headers: { server: /railway/i }, url: /\.up\.railway\.app/ },
  { name: 'Firebase Hosting', category: 'CDN / Hosting', description: 'Google static hosting', url: /\.web\.app|\.firebaseapp\.com/ },

  // ---------- Security / WAF / bot protection ----------
  { name: 'Sucuri', category: 'Security / WAF', description: 'Website firewall', headers: { server: /Sucuri/i, 'x-sucuri-id': ANY } },
  { name: 'Imperva Incapsula', category: 'Security / WAF', description: 'CDN and WAF', headers: { 'x-iinfo': ANY, 'x-cdn': /Incapsula|Imperva/i }, cookies: [/^incap_ses_/, /^visid_incap_/] },
  { name: 'AWS WAF', category: 'Security / WAF', description: 'AWS web application firewall', cookies: [/^aws-waf-token$/] },
  { name: 'Akamai Bot Manager', category: 'Security / WAF', description: 'Bot mitigation', cookies: [/^_abck$/, /^bm_sz$/] },
  { name: 'DataDome', category: 'Security / WAF', description: 'Bot protection', cookies: [/^datadome$/], headers: { 'x-datadome': ANY } },
  { name: 'Cloudflare Bot Management', category: 'Security / WAF', description: 'Bot mitigation', cookies: [/^__cf_bm$/, /^cf_clearance$/] },
  { name: 'reCAPTCHA', category: 'Security / WAF', description: 'Google CAPTCHA', html: [/google\.com\/recaptcha|recaptcha\/(?:api|enterprise)\.js/], js: `!!w.grecaptcha` },
  { name: 'hCaptcha', category: 'Security / WAF', description: 'Privacy-focused CAPTCHA', html: [/hcaptcha\.com\/1\/api\.js/], js: `!!w.hcaptcha` },
  { name: 'Cloudflare Turnstile', category: 'Security / WAF', description: 'CAPTCHA alternative', html: [/challenges\.cloudflare\.com\/turnstile/], js: `!!w.turnstile` },

  // ---------- Analytics ----------
  { name: 'Google Analytics', category: 'Analytics', description: 'Web analytics by Google', html: [/google-analytics\.com\/(?:analytics|ga)\.js/, /googletagmanager\.com\/gtag\/js/], js: `!!(w.gtag || w.ga || w.GoogleAnalyticsObject)` },
  { name: 'Google Tag Manager', category: 'Analytics', description: 'Tag management', html: [/googletagmanager\.com\/gtm\.js/, /\bGTM-[A-Z0-9]{4,}\b/], js: `!!w.google_tag_manager` },
  { name: 'Meta Pixel', category: 'Analytics', description: 'Facebook conversion tracking', html: [/connect\.facebook\.net\/[^"']+\/fbevents\.js/], js: `!!w.fbq` },
  { name: 'Hotjar', category: 'Analytics', description: 'Heatmaps and session recording', html: [/static\.hotjar\.com/], js: `!!w.hj` },
  { name: 'Microsoft Clarity', category: 'Analytics', description: 'Session recording', html: [/clarity\.ms\/tag/], js: `!!w.clarity` },
  { name: 'Segment', category: 'Analytics', description: 'Customer data platform', html: [/cdn\.segment\.com/], js: `w.analytics && w.analytics.VERSION` },
  { name: 'Mixpanel', category: 'Analytics', description: 'Product analytics', html: [/cdn\.mxpnl\.com|mixpanel-\d/], js: `!!(w.mixpanel && w.mixpanel.__loaded)` },
  { name: 'Amplitude', category: 'Analytics', description: 'Product analytics', html: [/cdn\.amplitude\.com/], js: `!!w.amplitude` },
  { name: 'PostHog', category: 'Analytics', description: 'Open-source product analytics', html: [/posthog(?:-js)?(?:\.min)?\.js|(?:us|eu)(?:-assets)?\.i\.posthog\.com|app\.posthog\.com/], js: `!!(w.posthog && w.posthog.__loaded)` },
  { name: 'Plausible', category: 'Analytics', description: 'Privacy-friendly analytics', html: [/plausible\.io\/js/], js: `!!w.plausible` },
  { name: 'Vercel Analytics', category: 'Analytics', description: 'Vercel web analytics', html: [/\/_vercel\/insights\/script\.js|\/_vercel\/speed-insights/] },
  { name: 'Cloudflare Web Analytics', category: 'Analytics', description: 'Privacy-first analytics', html: [/static\.cloudflareinsights\.com\/beacon/] },
  { name: 'Adobe Experience Platform', category: 'Analytics', description: 'Adobe tag management / analytics', html: [/assets\.adobedtm\.com/], js: `!!(w._satellite || w.s_c_il)` },
  { name: 'HubSpot', category: 'Analytics', description: 'Marketing automation', html: [/js\.hs-scripts\.com|js\.hsforms\.net|js\.hs-analytics\.net/], js: `!!w._hsq` },
  { name: 'LinkedIn Insight Tag', category: 'Analytics', description: 'LinkedIn ads tracking', html: [/snap\.licdn\.com/] },
  { name: 'TikTok Pixel', category: 'Analytics', description: 'TikTok ads tracking', html: [/analytics\.tiktok\.com/], js: `!!w.ttq` },

  // ---------- Monitoring ----------
  { name: 'Sentry', category: 'Monitoring', description: 'Error tracking', html: [/browser\.sentry-cdn\.com|js\.sentry-cdn\.com/], code: [/sentry\.io\/api|__SENTRY__/], js: `!!(w.__SENTRY__ || w.Sentry)` },
  { name: 'Datadog RUM', category: 'Monitoring', description: 'Real user monitoring', html: [/datadoghq-browser-agent|browser-intake-datadoghq/], js: `!!(w.DD_RUM || w.DD_LOGS)` },
  { name: 'New Relic', category: 'Monitoring', description: 'Application performance monitoring', html: [/js-agent\.newrelic\.com|NREUM/], js: `!!w.NREUM` },
  { name: 'LogRocket', category: 'Monitoring', description: 'Session replay', html: [/cdn\.logrocket\.io|cdn\.lr-ingest\.io/], js: `!!w.LogRocket` },

  // ---------- Payments ----------
  { name: 'Stripe', category: 'Payments', description: 'Payment processing', html: [/js\.stripe\.com/], js: `!!w.Stripe` },
  { name: 'PayPal', category: 'Payments', description: 'Online payments', html: [/paypal\.com\/sdk\/js|paypalobjects\.com/], js: `!!w.paypal` },

  // ---------- Widgets / services ----------
  { name: 'Intercom', category: 'Widgets / Services', description: 'Customer messaging', html: [/widget\.intercom\.io|js\.intercomcdn\.com/], js: `!!w.Intercom` },
  { name: 'Zendesk', category: 'Widgets / Services', description: 'Customer support widget', html: [/static\.zdassets\.com/], js: `!!w.zE` },
  { name: 'Drift', category: 'Widgets / Services', description: 'Conversational marketing', html: [/js\.driftt\.com/], js: `!!w.drift` },
  { name: 'Crisp', category: 'Widgets / Services', description: 'Live chat', html: [/client\.crisp\.chat/], js: `!!w.$crisp` },
  { name: 'Tawk.to', category: 'Widgets / Services', description: 'Live chat', html: [/embed\.tawk\.to/], js: `!!w.Tawk_API` },
  { name: 'Algolia', category: 'Widgets / Services', description: 'Hosted search', html: [/algolia(?:net|search)/i] },
  { name: 'OneTrust', category: 'Widgets / Services', description: 'Cookie consent management', html: [/cdn\.cookielaw\.org|optanon/i], js: `!!w.OneTrust` },
  { name: 'Cookiebot', category: 'Widgets / Services', description: 'Cookie consent management', html: [/consent\.cookiebot\.com/], js: `!!w.Cookiebot` },
  { name: 'YouTube Embed', category: 'Widgets / Services', description: 'Embedded YouTube player', html: [/youtube(?:-nocookie)?\.com\/embed\//] },
  { name: 'Google Maps', category: 'Widgets / Services', description: 'Embedded maps', html: [/maps\.googleapis\.com\/maps\/api|google\.com\/maps\/embed/] },
  { name: 'Mapbox', category: 'Widgets / Services', description: 'Maps platform', html: [/api\.mapbox\.com/], js: `!!w.mapboxgl` },
  { name: 'jsDelivr', category: 'CDN / Hosting', description: 'Public open-source CDN', html: [/cdn\.jsdelivr\.net/] },
  { name: 'cdnjs', category: 'CDN / Hosting', description: 'Public open-source CDN', html: [/cdnjs\.cloudflare\.com/] },
  { name: 'unpkg', category: 'CDN / Hosting', description: 'Public npm CDN', html: [/unpkg\.com\//] },
];

/** A single expression that returns { [techName]: version | true } when evaluated in the rendered page. */
export function buildJsProbeExpression(): string {
  const probes = TECH_SIGNATURES.filter((s) => s.js).map(
    (s) =>
      `try { const v = (${s.js}); if (v) out[${JSON.stringify(s.name)}] = (typeof v === 'string' || typeof v === 'number') ? String(v) : true; } catch (e) {}`
  );
  return `(() => { const w = window; const out = {}; ${probes.join('\n')} return out; })()`;
}
