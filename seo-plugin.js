import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== 本地 SEO 站点信息（替代原先的 Sanity globalInfo） =====
const SITE_URL = 'https://shaun.dev';

const SITE_META = {
    siteTitle: 'Shaun Dev | 3D Web Developer Portfolio',
    siteDescription: 'Interactive 3D developer portfolio by Shaun. Explore AI projects, WebGL experiments, React apps & creative 3D experiences in a hand-drawn gallery.',
    aboutMe: "Shaun is a creative developer who builds interactive, engaging websites from scratch. He specializes in 3D web experiences, AI-powered applications, and clean, well-animated storytelling sites.",
    githubUrl: 'https://github.com/Shaun520',
    linkedinUrl: '',
    instagramUrl: '',
    xUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
};

// ===== 本地内容文件（替代原先的 Sanity 数据源） =====
const DEV_CONTENT_PATH = resolve(__dirname, 'public/site.content.dev.json');

// 加载本地站点内容（public/site.content.dev.json）
function loadLocalContent() {
    try {
        return JSON.parse(readFileSync(DEV_CONTENT_PATH, 'utf8'));
    } catch {
        console.error('SEO Plugin: 无法读取 public/site.content.dev.json');
        return { content: {} };
    }
}

// ===== 从本地内容映射出 SEO 数据（结构兼容原 Sanity 查询结果） =====
function buildLocalSeoData() {
    const dev = loadLocalContent();
    const content = dev.content || {};

    // galleryProject
    const projects = (content.gallery?.projects || []).map((p) => ({
        title: p.title,
        description: p.description || '',
        url: p.url || '',
        seoTitle: p.title,
        seoDescription: p.description || '',
        techStack: (p.techStack || []).map((t) => {
            const name = String(t).split('/').pop() || '';
            return name.replace(/\.[a-z0-9]+$/i, '');
        }),
    }));

    // studioItem
    const studio = (content.studio?.items || []).map((s) => {
        const num = (v) => {
            if (!v) return undefined;
            const n = Number(String(v).replace(/[^\d]/g, ''));
            return Number.isFinite(n) && n > 0 ? n : undefined;
        };
        return {
            title: s.title || '',
            platform: s.platform || 'blog',
            url: s.url || '',
            description: s.description || '',
            thumbnailUrl: s.thumbnail || s.frontTexture || undefined,
            date: s.date || undefined,
            views: num(s.views),
            likes: num(s.likes),
            duration: s.duration,
            readTime: s.readTime,
        };
    });

    // awardCertificate：把本地奖项分组（featured/sotd/sotm/other）拍平为一条条记录
    const awards = [];
    for (const [group, block] of Object.entries(content.about?.awards || {})) {
        const category = ['sotd', 'sotm'].includes(group) ? group : 'other';
        for (const item of block?.items || []) {
            awards.push({
                title: item.label || group,
                category,
                date: item.date || undefined,
                url: item.url || '',
                seoTitle: item.label || group,
                seoDescription: item.label || '',
            });
        }
    }

    // faq — 从 about 数据无从映射，先留空（JSON-LD / llms.txt 均自动跳过）
    const faqList = [];

    return { globalInfo: SITE_META, projects, studio, awards, faqList };
}

// Tech stack filename -> human-readable name mapping for JSON-LD
const TECH_STACK_NAMES = {
    'reactlogo.webp': 'React',
    'htmllogo.webp': 'HTML',
    'csslogo.webp': 'CSS',
    'jslogo.webp': 'JavaScript',
    'tailwindlogo.webp': 'Tailwind CSS',
    'firebaselogo.webp': 'Firebase',
    'netlifylogo.webp': 'Netlify',
    'wordpresslogo.webp': 'WordPress',
    'elementorlogo.webp': 'Elementor',
    'phplogo.webp': 'PHP',
};

/**
 * Helper to ensure dates are in ISO-8601 format with timezone for SEO.
 */
function formatIsoDate(dateString) {
    if (!dateString) return undefined;
    if (dateString.includes('T')) return dateString; // Already has time/timezone
    return `${dateString}T12:00:00Z`; // Default to noon UTC
}

/**
 * Build dynamic JSON-LD structured data from local content.
 * This generates schema.org entities that AI search engines (Google AI Overviews,
 * Perplexity, Gemini) use to understand and cite content in their answers.
 */
function buildJsonLd(globalInfo, projects, studio, awards, faqList) {
    const graph = [];

    // --- 1. Person: Central node of the Knowledge Graph ---
    const person = {
        '@type': 'Person',
        '@id': `${SITE_URL}/#person`,
        name: 'Shaun',
        alternateName: ['Shaun', 'Shaun Dev', 'Shaun520'],
        url: SITE_URL,
        jobTitle: 'Creative Frontend Developer',
        description: globalInfo?.aboutMe || 'Creative developer specializing in 3D web experiences.',
        knowsAbout: ['React', 'Three.js', 'JavaScript', 'TypeScript', 'GSAP', 'Next.js', 'WebGL', '3D Graphics', 'Web Development'],
        sameAs: [
            globalInfo?.linkedinUrl,
            globalInfo?.githubUrl,
            globalInfo?.instagramUrl,
            globalInfo?.xUrl,
            globalInfo?.tiktokUrl,
            globalInfo?.youtubeUrl
        ].filter(Boolean)
    };
    graph.push(person);

    // --- 2. WebSite ---
    const website = {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: globalInfo?.siteTitle || 'Shaun Dev | 3D Web Developer Portfolio',
        description: globalInfo?.siteDescription || 'Interactive 3D Developer Portfolio by Shaun',
        publisher: { '@id': `${SITE_URL}/#person` }
    };
    graph.push(website);

    // --- 3. ProfilePage ---
    const profilePage = {
        '@type': 'ProfilePage',
        '@id': `${SITE_URL}/#profilepage`,
        url: SITE_URL,
        mainEntity: { '@id': `${SITE_URL}/#person` },
        about: { '@id': `${SITE_URL}/#person` }
    };
    graph.push(profilePage);

    // --- 4. FAQPage (GEO & AI search engine optimizer) ---
    if (faqList && faqList.length > 0) {
        const faqPage = {
            '@type': 'FAQPage',
            '@id': `${SITE_URL}/#faq`,
            mainEntity: faqList.map(item => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer
                }
            }))
        };
        graph.push(faqPage);
    }

    // --- 5. ItemList: Portfolio Projects (Google rich results for lists) ---
    if (projects && projects.length > 0) {
        graph.push({
            '@type': 'ItemList',
            '@id': `${SITE_URL}/#projectslist`,
            name: 'Portfolio Projects by Shaun',
            description: 'Selected web development projects showcasing React, Three.js, and creative frontend engineering.',
            numberOfItems: projects.length,
            itemListElement: projects.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'CreativeWork',
                    name: p.seoTitle || p.title,
                    description: p.seoDescription || p.description || '',
                    url: p.url || undefined,
                    creator: { '@id': `${SITE_URL}/#person` },
                    ...(p.techStack && p.techStack.length > 0 ? {
                        keywords: p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')
                    } : {}),
                }
            }))
        });

        // Individual CreativeWork entries for each project (richer detail)
        projects.forEach(p => {
            const projectSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            graph.push({
                '@type': 'CreativeWork',
                '@id': `${SITE_URL}/#project-${projectSlug}`,
                name: p.seoTitle || p.title,
                description: p.seoDescription || p.description || '',
                url: p.url || undefined,
                creator: { '@id': `${SITE_URL}/#person` },
                ...(p.techStack && p.techStack.length > 0 ? {
                    keywords: p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')
                } : {}),
            });
        });
    }

    // --- 6. Studio Content (YouTube -> VideoObject, Blog -> Article, TikTok -> VideoObject) ---
    if (studio && studio.length > 0) {
        studio.forEach((s, idx) => {
            const studioSlug = `studio-item-${idx}`;
            if (s.platform === 'youtube') {
                let embedUrl = undefined;
                if (s.url) {
                    const ytMatch = s.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/);
                    if (ytMatch && ytMatch[1]) {
                        embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
                    }
                }

                graph.push({
                    '@type': 'VideoObject',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    name: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    contentUrl: s.url || undefined,
                    ...(embedUrl ? { embedUrl } : {}),
                    thumbnailUrl: s.thumbnailUrl || `${SITE_URL}/og-image.webp`,
                    ...(s.duration ? { duration: `PT${s.duration.replace(':', 'M')}S` } : {}),
                    ...(s.date ? { uploadDate: formatIsoDate(s.date) } : {}),
                    ...(s.views ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: s.views } } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'blog') {
                graph.push({
                    '@type': 'Article',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || `${SITE_URL}/og-image.webp`,
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    ...(s.readTime ? { timeRequired: `PT${s.readTime.replace(' min', '')}M` } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'tiktok') {
                graph.push({
                    '@type': 'VideoObject',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    name: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    contentUrl: s.url || undefined,
                    thumbnailUrl: s.thumbnailUrl || `${SITE_URL}/og-image.webp`,
                    ...(s.date ? { uploadDate: formatIsoDate(s.date) } : {}),
                    ...(s.views ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: s.views } } : {}),
                    ...(s.likes ? { aggregateRating: { '@type': 'AggregateRating', ratingCount: s.likes } } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'instagram' || s.platform === 'x' || s.platform === 'linkedin') {
                graph.push({
                    '@type': 'SocialMediaPosting',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || `${SITE_URL}/og-image.webp`,
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    ...(s.likes ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: s.likes } } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'codrops') {
                graph.push({
                    '@type': 'Article',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || `${SITE_URL}/og-image.webp`,
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            }
        });
    }

    // --- 7. Awards as schema.org Award/CreativeWork ---
    if (awards && awards.length > 0) {
        const categoryLabels = { sotd: 'Site of the Day', sotm: 'Site of the Month', other: 'Honorable Mention' };
        graph.push({
            '@type': 'ItemList',
            '@id': `${SITE_URL}/#awardslist`,
            name: 'Web Design Awards received by Shaun',
            numberOfItems: awards.length,
            itemListElement: awards.map((a, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'CreativeWork',
                    name: `${categoryLabels[a.category] || a.category} — ${a.seoTitle || a.title}`,
                    ...(a.date ? { dateCreated: formatIsoDate(a.date) } : {}),
                    url: a.url || undefined,
                    description: a.seoDescription || undefined,
                    award: categoryLabels[a.category] || a.category,
                    creator: { '@id': `${SITE_URL}/#person` },
                }
            }))
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph
    };
}

// Helper to generate the llms.txt content in clean Markdown
function buildLlmsTxt(globalInfo, projects, studio, awards, faqList) {
    const siteTitle = globalInfo?.siteTitle || 'Shaun Dev | 3D Web Developer Portfolio';
    const siteDescription = globalInfo?.siteDescription || 'Interactive 3D Developer Portfolio';
    const aboutMe = globalInfo?.aboutMe || 'I am a creative developer specializing in 3D web experiences.';

    let content = `# ${siteTitle}\n`;
    content += `> ${siteDescription}\n\n`;

    content += `## Biography / About Me\n`;
    content += `${aboutMe}\n\n`;

    content += `## Core Technologies & Skills\n`;
    content += `- React, Three.js, React Three Fiber (R3F), GSAP (GreenSock), JavaScript, TypeScript, Next.js, WebGL, 3D Graphics, Web Development.\n\n`;

    if (projects && projects.length > 0) {
        content += `## Selected Portfolio Projects\n`;
        projects.forEach(p => {
            const tech = p.techStack ? ` (Tech: ${p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')})` : '';
            content += `- [${p.seoTitle || p.title}](${p.url || SITE_URL}): ${p.seoDescription || p.description || ''}${tech}\n`;
        });
        content += `\n`;
    }

    if (studio && studio.length > 0) {
        content += `## Studio Content & Publications\n`;
        studio.forEach(s => {
            content += `- [${s.seoTitle || s.title} (${s.platform})](${s.url || SITE_URL}): ${s.seoDescription || s.description || ''}\n`;
        });
        content += `\n`;
    }

    if (awards && awards.length > 0) {
        content += `## Design Awards & Achievements\n`;
        const categoryLabels = { sotd: 'Site of the Day', sotm: 'Site of the Month', other: 'Honorable Mention' };
        awards.forEach(a => {
            const category = categoryLabels[a.category] || a.category;
            content += `- **${category}** — [${a.seoTitle || a.title}](${a.url || SITE_URL}): Awarded on ${a.date || 'unknown'}. ${a.seoDescription || ''}\n`;
        });
        content += `\n`;
    }

    if (faqList && faqList.length > 0) {
        content += `## Frequently Asked Questions (FAQ)\n`;
        faqList.forEach(item => {
            content += `- **${item.question}**\n`;
            content += `  ${item.answer.replace(/\n/g, '\n  ')}\n`;
        });
    }

    return content;
}

export function generateSeoHtml() {
    let cachedLlmsContent = '';

    async function getLlmsContent() {
        if (!cachedLlmsContent) {
            try {
                const { globalInfo, projects, studio, awards, faqList } = buildLocalSeoData();
                cachedLlmsContent = buildLlmsTxt(globalInfo, projects, studio, awards, faqList);
            } catch (e) {
                console.error('SEO Plugin Error: Failed to build llms.txt from local content', e);
                cachedLlmsContent = `# Shaun Dev\n> Creative Developer\n`;
            }
        }
        return cachedLlmsContent;
    }

    return {
        name: 'local-seo-plugin',

        // Serve llms.txt in local development mode
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url === '/llms.txt') {
                    const content = await getLlmsContent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end(content);
                } else {
                    next();
                }
            });
        },

        // This hook runs when Vite generates or serves index.html
        async transformIndexHtml(html) {
            try {
                // 从本地内容构建 SEO 数据（替代原先的 Sanity 拉取）
                const { globalInfo, projects, studio, awards, faqList } = buildLocalSeoData();

                const siteTitle = globalInfo?.siteTitle || 'Shaun Dev | 3D Web Developer Portfolio';
                const siteDescription = globalInfo?.siteDescription || 'Interactive 3D portfolio of a creative web developer.';
                const aboutMe = globalInfo?.aboutMe || 'I am a creative developer specializing in 3D web experiences.';

                // Cache llms.txt content for later bundle emission
                cachedLlmsContent = buildLlmsTxt(globalInfo, projects, studio, awards, faqList);

                // ====== PART 1: Build the semantic HTML string ======
                let seoHtml = `\n<div id="seo-content" class="sr-only-seo">\n`;
                
                seoHtml += `  <header>\n`;
                seoHtml += `    <h1>${siteTitle}</h1>\n`;
                seoHtml += `    <p>${siteDescription}</p>\n`;
                seoHtml += `  </header>\n`;

                seoHtml += `  <section id="about">\n`;
                seoHtml += `    <h2>About Me</h2>\n`;
                seoHtml += `    <p>${aboutMe}</p>\n`;
                if (globalInfo?.githubUrl) seoHtml += `    <a href="${globalInfo.githubUrl}">GitHub</a>\n`;
                if (globalInfo?.linkedinUrl) seoHtml += `    <a href="${globalInfo.linkedinUrl}">LinkedIn</a>\n`;
                seoHtml += `  </section>\n`;

                if (projects && projects.length > 0) {
                    seoHtml += `  <section id="projects">\n    <h2>Projects</h2>\n    <ul>\n`;
                    projects.forEach(p => {
                        seoHtml += `      <li>\n        <h3>${p.seoTitle || p.title}</h3>\n        <p>${p.seoDescription || p.description || ''}</p>\n        ${p.url ? `<a href="${p.url}">Visit ${p.seoTitle || p.title}</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                if (studio && studio.length > 0) {
                    seoHtml += `  <section id="studio">\n    <h2>The Studio (Content)</h2>\n    <ul>\n`;
                    studio.forEach(s => {
                        seoHtml += `      <li>\n        <h3>${s.seoTitle || s.title} (${s.platform})</h3>\n        <p>${s.seoDescription || s.description || ''}</p>\n        ${s.url ? `<a href="${s.url}">View Content</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                if (awards && awards.length > 0) {
                    seoHtml += `  <section id="awards">\n    <h2>Awards & Certificates</h2>\n    <ul>\n`;
                    awards.forEach(a => {
                        seoHtml += `      <li>\n        <h3>${a.seoTitle || a.title}</h3>\n        <p>${a.category} - ${a.date}</p>\n        <p>${a.seoDescription || ''}</p>\n        ${a.url ? `<a href="${a.url}">Link</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                // FAQ Section (GEO/AI search optimizer fallback)
                if (faqList && faqList.length > 0) {
                    seoHtml += `  <section id="faq">\n`;
                    seoHtml += `    <h2>Frequently Asked Questions (FAQ)</h2>\n`;
                    faqList.forEach(item => {
                        seoHtml += `    <article>\n`;
                        seoHtml += `      <h3>${item.question}</h3>\n`;
                        seoHtml += `      <p>${item.answer}</p>\n`;
                        seoHtml += `    </article>\n`;
                    });
                    seoHtml += `  </section>\n`;
                }

                seoHtml += `</div>\n`;

                // ====== PART 2: Build dynamic JSON-LD ======
                const jsonLdSchemas = buildJsonLd(globalInfo, projects, studio, awards, faqList);
                const jsonLdScript = `\n  <!-- Dynamic Structured Data (JSON-LD) — generated from local content at build time -->\n  <script type="application/ld+json">\n${JSON.stringify(jsonLdSchemas, null, 2)}\n  </script>\n`;

                // ====== PART 3: Transform HTML ======
                // Update the <title> tag
                let transformedHtml = html.replace(
                    /<title>(.*?)<\/title>/,
                    `<title>${siteTitle}</title>`
                );
                
                // Add or replace meta description
                if (transformedHtml.includes('<meta name="description"')) {
                    transformedHtml = transformedHtml.replace(
                        /<meta name="description" content="(.*?)"\s*\/?>/,
                        `<meta name="description" content="${siteDescription}" />`
                    );
                } else {
                    transformedHtml = transformedHtml.replace(
                        '</head>',
                        `  <meta name="description" content="${siteDescription}" />\n</head>`
                    );
                }

                // Update Open Graph dynamic metadata
                transformedHtml = transformedHtml
                    .replace(
                        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:title" content="${siteTitle}" />`
                    )
                    .replace(
                        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:description" content="${siteDescription}" />`
                    );

                // Update Twitter card dynamic metadata
                transformedHtml = transformedHtml
                    .replace(
                        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
                        `<meta name="twitter:title" content="${siteTitle}" />`
                    )
                    .replace(
                        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
                        `<meta name="twitter:description" content="${siteDescription}" />`
                    );

                // Inject dynamic JSON-LD right before </head> (next to the existing static one)
                transformedHtml = transformedHtml.replace('</head>', `${jsonLdScript}</head>`);

                // Replace the static placeholder with the dynamic one to prevent duplicate #seo-content and double h1s
                if (transformedHtml.includes('id="seo-content"')) {
                    transformedHtml = transformedHtml.replace(
                        /<div id="seo-content" class="sr-only-seo">[\s\S]*?<\/div>/,
                        seoHtml
                    );
                } else {
                    // Fallback injection if the template doesn't contain the static block
                    transformedHtml = transformedHtml.replace('</body>', `${seoHtml}</body>`);
                }

                return transformedHtml;
            } catch (error) {
                console.error('SEO Plugin Error: Failed to build SEO from local content', error);
                // Return original HTML on failure so we don't break the build
                return html;
            }
        },

        // Emit llms.txt to the build output directory
        async generateBundle() {
            const content = await getLlmsContent();
            this.emitFile({
                type: 'asset',
                fileName: 'llms.txt',
                source: content
            });
        }
    };
}
