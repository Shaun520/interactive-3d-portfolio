/**
 * =============================================================================
 * prune-dist-assets.js — 生产构建后清理未引用静态资源
 * =============================================================================
 *
 * 用途：npm run build（vite build && node scripts/prune-dist-assets.js）
 *
 * 「被使用资源白名单」来源（并集）：
 *   1. texturePreloadList.js 导出的完整贴图数组（PRELOAD_ALL / PRELOAD_LOADER /
 *      UI_TEXTURES / IMAGE_ASSETS / GALLERY_TEXTURES / CONTACT_TEXTURES /
 *      ABOUT_TEXTURES / STUDIO_TEXTURES / ENTRANCE_TEXTURES / CORRIDOR_TEXTURES）。
 *      这是运行时计算好的「真实会用到的路径全集」，覆盖了模板字符串拼接
 *      （如 gallery 的 ${name}_painted.webp）——比正则扫描字符串更可靠。
 *   2. src/ 全部 js/jsx/scss/css 源码中出现的 /textures /sounds /images /fonts
 *      /cursors 路径字面量（补充字体、音效、地图等不在预载列表里的资源）。
 *
 * 清理规则：
 *   - 删除 dist 下 textures/sounds/images/fonts/cursors 中不在白名单的文件
 *     （含对应 .gz）。
 *   - 删除 dist/site.content.dev.json(.gz)（dev 编辑面板覆盖文件，生产不需要）。
 *   - 保留 dist 根级文件（index.html、assets/*、_headers、_redirects、
 *     favico.png、og-image.webp、robots.txt、sitemap.xml、llms.txt、vite.svg）。
 * =============================================================================
 */
import { readFileSync, readdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    ENTRANCE_TEXTURES,
    CORRIDOR_TEXTURES,
    UI_TEXTURES,
    IMAGE_ASSETS,
    GALLERY_TEXTURES,
    CONTACT_TEXTURES,
    ABOUT_TEXTURES,
    STUDIO_TEXTURES,
    PRELOAD_ALL,
    PRELOAD_LOADER,
} from '../src/config/texturePreloadList.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');
const DIST_DIR = resolve(ROOT, 'dist');

// 资源在 public/dist 下的子目录（仅清理这些，根级文件保留）
const ASSET_DIRS = ['textures', 'sounds', 'images', 'fonts', 'cursors'];

// 匹配的绝对路径前缀
const URL_PREFIXES = ['/textures/', '/sounds/', '/images/', '/fonts/', '/cursors/'];

/**
 * 从文本中提取所有形如 /textures/...、/sounds/... 的路径字面量（含模板字符串）
 */
function extractAssetPaths(text) {
    const found = new Set();
    for (const prefix of URL_PREFIXES) {
        // 匹配单/双引号或模板字符串中的路径；模板字符串只取纯字面量部分
        const re = new RegExp(`['"\`](${prefix.replace(/\//g, '\\/')}[A-Za-z0-9_./${'-'}]+)['"\`]`, 'g');
        let m;
        while ((m = re.exec(text)) !== null) {
            const raw = m[1];
            // 模板字符串中的 ${...} 动态段不是字面量文件，跳过（由预载数组覆盖）
            if (raw.includes('${')) continue;
            const clean = raw.replace(/['"`)\],;\s]+$/, '');
            if (clean.length > prefix.length) found.add(clean);
        }
    }
    return [...found];
}

/**
 * 递归读取目录下所有文件绝对路径
 */
function listFiles(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            listFiles(full, out);
        } else {
            out.push(full);
        }
    }
    return out;
}

/**
 * 递归收集目录下所有「相对 public 的路径」
 */
function listPublicRelativeFiles() {
    const out = [];
    for (const dir of ASSET_DIRS) {
        const abs = join(PUBLIC_DIR, dir);
        if (!existsSync(abs)) continue;
        for (const f of listFiles(abs)) {
            out.push(relative(PUBLIC_DIR, f).replace(/\\/g, '/'));
        }
    }
    return out;
}

/**
 * 构建白名单（三源并集 + 存在性校验）
 */
function buildAllowlist() {
    const allowed = new Set();

    // 1) 预载列表：运行时计算好的完整贴图路径全集
    const preloadLists = [
        ENTRANCE_TEXTURES,
        CORRIDOR_TEXTURES,
        UI_TEXTURES,
        IMAGE_ASSETS,
        GALLERY_TEXTURES,
        CONTACT_TEXTURES,
        ABOUT_TEXTURES,
        STUDIO_TEXTURES,
        PRELOAD_ALL,
        PRELOAD_LOADER,
    ];
    for (const list of preloadLists) {
        for (const p of list || []) {
            if (typeof p === 'string' && p.startsWith('/')) allowed.add(p);
        }
    }

    // 2) src 全部源码中的路径字面量（含 site.config.js 与组件、scss）
    const srcDir = resolve(ROOT, 'src');
    for (const f of listFiles(srcDir)) {
        if (!/\.(js|jsx|ts|tsx|scss|css)$/.test(f)) continue;
        const text = readFileSync(f, 'utf8');
        for (const p of extractAssetPaths(text)) {
            allowed.add(p);
        }
    }

    // 校验存在性：仅保留 public/ 下真实存在的文件
    const valid = new Set();
    for (const p of allowed) {
        const rel = p.replace(/^\//, '');
        if (existsSync(join(PUBLIC_DIR, rel))) valid.add(rel);
    }
    return valid;
}

/**
 * 主流程
 */
function main() {
    console.log('\n[prune-dist-assets] 开始清理 dist 中未引用的静态资源…');

    if (!existsSync(DIST_DIR)) {
        console.warn('[prune-dist-assets] dist 目录不存在，跳过清理。');
        return;
    }

    const allowlist = buildAllowlist();
    console.log(`[prune-dist-assets] 白名单文件数（public 相对路径）: ${allowlist.size}`);

    const allPublicRel = listPublicRelativeFiles();
    let deletedCount = 0;
    let deletedBytes = 0;
    const deleted = [];

    // 遍历 dist 对应目录下所有文件，删除不在白名单内的
    for (const rel of allPublicRel) {
        const inAllowlist = allowlist.has(rel);
        const distFile = join(DIST_DIR, rel);
        const gzFile = `${distFile}.gz`;

        if (!inAllowlist) {
            if (existsSync(distFile)) {
                const size = statSync(distFile).size;
                rmSync(distFile, { force: true });
                deletedCount++;
                deletedBytes += size;
                deleted.push(rel);
            }
            if (existsSync(gzFile)) rmSync(gzFile, { force: true });
        }
    }

    // 删除 dev 覆盖文件
    for (const f of ['site.content.dev.json', 'site.content.dev.json.gz']) {
        const p = join(DIST_DIR, f);
        if (existsSync(p)) {
            const size = statSync(p).size;
            rmSync(p, { force: true });
            deletedCount++;
            deletedBytes += size;
            deleted.push(f);
        }
    }

    // 清理可能残留的空目录
    for (const dir of ASSET_DIRS) {
        const abs = join(DIST_DIR, dir);
        if (existsSync(abs)) {
            for (const f of listFiles(abs).slice().reverse()) {
                const parent = dirname(f);
                try {
                    if (existsSync(parent) && readdirSync(parent).length === 0) {
                        rmSync(parent, { recursive: true, force: true });
                    }
                } catch { /* ignore */ }
            }
            try {
                if (readdirSync(abs).length === 0) rmSync(abs, { recursive: true, force: true });
            } catch { /* ignore */ }
        }
    }

    console.log(`[prune-dist-assets] 删除文件数: ${deletedCount}, 释放: ${(deletedBytes / 1024 / 1024).toFixed(2)} MB`);
    if (deleted.length > 0) {
        console.log('[prune-dist-assets] 已删除文件列表:');
        for (const d of deleted) console.log(`  - ${d}`);
    } else {
        console.log('[prune-dist-assets] 无文件需要删除。');
    }
    console.log('[prune-dist-assets] 清理完成。\n');
}

main();
