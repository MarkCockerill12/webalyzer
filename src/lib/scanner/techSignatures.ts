import { TechItem } from '../types';

export function detectTechStack(
  html: string,
  scriptContents: string[],
  headers: Record<string, string>,
  url: string
): TechItem[] {
  const stack: TechItem[] = [];
  const combined = [html, ...scriptContents].join('\n');
  const lowerCombined = combined.toLowerCase();

  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = String(v).toLowerCase();
  }

  const serverHeader = lowerHeaders['server'] || '';
  const poweredBy = lowerHeaders['x-powered-by'] || '';
  const viaHeader = lowerHeaders['via'] || '';

  const addTech = (item: TechItem) => {
    if (!stack.some((t) => t.name.toLowerCase() === item.name.toLowerCase())) {
      stack.push(item);
    }
  };

  // 1. 3D & Graphics (WebGL, Three.js, Canvas)
  if (
    lowerCombined.includes('three.js') ||
    lowerCombined.includes('three') ||
    lowerCombined.includes('perspectivecamera') ||
    lowerCombined.includes('gltfloader') ||
    lowerCombined.includes('orbitcontrols') ||
    lowerCombined.includes('scene.add')
  ) {
    addTech({
      name: 'Three.js',
      category: 'Build Tool / Lib',
      confidence: 95,
      description: '3D JavaScript Graphics Library',
    });
  }

  if (lowerCombined.includes('<canvas') || lowerCombined.includes('getcontext("2d")') || lowerCombined.includes("getcontext('2d')") || lowerCombined.includes('webgl')) {
    addTech({
      name: 'HTML5 Canvas / WebGL',
      category: 'Frontend Framework',
      confidence: 100,
      description: 'Hardware-accelerated 2D/3D Rendering Engine',
    });
  }

  // 2. Vite Build Tool
  if (lowerCombined.includes('vite') || lowerCombined.includes('/@vite/') || lowerCombined.includes('import.meta.env')) {
    addTech({
      name: 'Vite',
      category: 'Build Tool / Lib',
      confidence: 95,
      description: 'Next Generation Frontend Tooling',
    });
  }

  // 3. React & Next.js
  if (lowerCombined.includes('__next') || lowerCombined.includes('/_next/static') || lowerHeaders['x-nextjs-page'] || lowerHeaders['x-nextjs-cache']) {
    addTech({
      name: 'Next.js',
      category: 'Frontend Framework',
      confidence: 100,
      description: 'React Production Framework for SSR and SSG',
    });
  }

  if (
    lowerCombined.includes('react') ||
    lowerCombined.includes('data-reactroot') ||
    lowerCombined.includes('__reactfiber') ||
    lowerCombined.includes('createroot') ||
    lowerCombined.includes('_jsx') ||
    lowerCombined.includes('usestate')
  ) {
    addTech({
      name: 'React',
      category: 'Frontend Framework',
      confidence: 95,
      description: 'JavaScript UI library by Meta',
    });
  }

  // 4. Vue.js / Nuxt
  if (lowerCombined.includes('vue') || lowerCombined.includes('data-v-') || lowerCombined.includes('__vue__')) {
    addTech({ name: 'Vue.js', category: 'Frontend Framework', confidence: 90, description: 'Progressive JS Framework' });
  }
  if (lowerCombined.includes('__nuxt') || lowerCombined.includes('/_nuxt/') || lowerHeaders['x-nuxt-version']) {
    addTech({ name: 'Nuxt.js', category: 'Frontend Framework', confidence: 100, description: 'Vue Production Framework' });
  }

  // 5. TypeScript
  if (lowerCombined.includes('typescript') || lowerCombined.includes('tslib') || lowerCombined.includes('__extends') || lowerCombined.includes('__assign')) {
    addTech({
      name: 'TypeScript',
      category: 'Backend / Language',
      confidence: 90,
      description: 'Typed superset of JavaScript',
    });
  }

  // 6. Tailwind CSS & Styling
  if (
    lowerCombined.includes('tailwind') ||
    /class="[^"]*(flex|grid|px-|py-|bg-|text-|rounded-|shadow-)[^"]*"/.test(combined) ||
    lowerCombined.includes('tailwindcss')
  ) {
    addTech({
      name: 'Tailwind CSS',
      category: 'CSS Framework',
      confidence: 90,
      description: 'Utility-first CSS Framework',
    });
  }

  // 7. Hosting & CDN Infrastructure
  if (serverHeader.includes('cloudflare') || lowerHeaders['cf-ray'] || lowerHeaders['cf-cache-status']) {
    addTech({ name: 'Cloudflare', category: 'CDN / Hosting', confidence: 100, description: 'Global CDN & Edge Network' });
  }
  if (serverHeader.includes('vercel') || lowerHeaders['x-vercel-id']) {
    addTech({ name: 'Vercel', category: 'CDN / Hosting', confidence: 100, description: 'Frontend Cloud Platform' });
  }
  if (serverHeader.includes('netlify') || lowerHeaders['x-nf-request-id']) {
    addTech({ name: 'Netlify', category: 'CDN / Hosting', confidence: 100, description: 'Web development & hosting platform' });
  }
  if (url.includes('github.io') || serverHeader.includes('github.com')) {
    addTech({ name: 'GitHub Pages', category: 'CDN / Hosting', confidence: 100, description: 'Static Site Hosting by GitHub' });
  }
  if (serverHeader.includes('nginx')) {
    addTech({ name: 'Nginx', category: 'CDN / Hosting', confidence: 95, description: 'High Performance Web Server' });
  }

  // 8. PHP / WordPress / Laravel
  if (poweredBy.includes('php') || lowerCombined.includes('.php') || lowerHeaders['set-cookie']?.includes('phpsessid')) {
    addTech({ name: 'PHP', category: 'Backend / Language', confidence: 95, description: 'Server-side scripting language' });
  }
  if (lowerCombined.includes('wp-content') || lowerCombined.includes('wp-includes')) {
    addTech({ name: 'WordPress', category: 'CMS / Platform', confidence: 100, description: 'World\'s most popular CMS' });
  }

  // 9. Databases & Cloud APIs
  if (lowerCombined.includes('firebase') || lowerCombined.includes('firebaseapp.com')) {
    addTech({ name: 'Google Firebase', category: 'Database', confidence: 95, description: 'NoSQL Realtime Database' });
  }
  if (lowerCombined.includes('supabase') || lowerCombined.includes('.supabase.co')) {
    addTech({ name: 'Supabase', category: 'Database', confidence: 95, description: 'PostgreSQL Cloud Backend' });
  }

  // 10. Web APIs & Animation Libraries
  if (lowerCombined.includes('gsap') || lowerCombined.includes('greensock') || lowerCombined.includes('tweenmax')) {
    addTech({ name: 'GSAP', category: 'Build Tool / Lib', confidence: 95, description: 'GreenSock Animation Platform' });
  }
  if (lowerCombined.includes('framer-motion') || lowerCombined.includes('framermotion')) {
    addTech({ name: 'Framer Motion', category: 'Build Tool / Lib', confidence: 90, description: 'Motion library for React' });
  }
  if (lowerCombined.includes('lucide') || lowerCombined.includes('lucide-react')) {
    addTech({ name: 'Lucide Icons', category: 'Build Tool / Lib', confidence: 90, description: 'Modern open source icon set' });
  }

  // Generic JavaScript Web App Fallback
  if (stack.length === 0) {
    addTech({
      name: 'JavaScript / HTML5 Web App',
      category: 'Frontend Framework',
      confidence: 100,
      description: 'Standard modern JavaScript client application',
    });
  }

  return stack;
}
