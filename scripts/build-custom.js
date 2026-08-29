/**
 * =============================================================================
 * build-custom.js — 打包「自定义配置」的构建脚本
 * =============================================================================
 *
 * 用途：npm run build:custom（或 build）
 *
 * 背景：
 *   用户通过编辑面板（ContentEditorPanel）修改的内容（项目卡片 / 门牌 /
 *   贴图 / 字体选择 / 音乐等）保存在 public/site.content.dev.json 中。
 *   生产构建（SiteConfigContext）会加载该文件并覆盖默认配置 site.config.js，
 *   因此「打包产物」应使用这份自定义配置，而非默认配置。
 *
 * 本脚本在 vite build 之前：
 *   1. 校验 public/site.content.dev.json 存在；不存在则告警（会打包默认配置）。
 *   2. 校验 dev.json 引用的 /textures /sounds /images /fonts 资源在 public 中都存在，
 *      防止打包后线上 404（只告警，不阻断，FEATURED.webp 这类幽灵文件允许跳过）。
 *   3. 输出本次被打包的自定义内容摘要（覆盖了哪些房间 / 字体选择），便于确认。
 *
 * 随后调用标准构建：vite build && node scripts/prune-dist-assets.js
 * =============================================================================
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEV_CONTENT_PATH = join(ROOT, 'public/site.content.dev.json');

const URL_PREFIXES = ['/textures/', '/sounds/', '/images/', '/fonts/', '/cursors/'];

function extractAssetPaths(text) {
    const found = new Set();
    for (const prefix of URL_PREFIXES) {
        const re = new RegExp(`['"\`](${prefix.replace(/\//g, '\\/')}[A-Za-z0-9_./${'-'}]+)['"\`]`, 'g');
        let m;
        while ((m = re.exec(text)) !== null) {
            const raw = m[1];
            if (raw.includes('${')) continue;
            const clean = raw.replace(/['"`)\],;\s]+$/, '');
            if (clean.length > prefix.length) found.add(clean);
        }
    }
    return [...found];
}

console.log('\n[build-custom] 检查自定义配置（site.content.dev.json）…');

if (!existsSync(DEV_CONTENT_PATH)) {
    console.warn('[build-custom] ⚠️  未找到 public/site.content.dev.json —— 将打包「默认配置」。');
    console.warn('[build-custom]    如需打包自定义内容，请先在编辑面板修改并保存（写入该文件）。');
} else {
    const raw = readFileSync(DEV_CONTENT_PATH, 'utf8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error('[build-custom] ❌ dev.json 解析失败：', e.message);
        process.exit(1);
    }

    const content = data.content || {};
    const rooms = data.rooms || {};
    const covered = Object.keys(content).filter((k) => content[k] !== undefined);
    const roomFields = Object.keys(rooms).filter((k) => rooms[k] !== undefined);
    const fonts = data.themeFonts || content.themeFonts;

    console.log(`[build-custom] ✓ 找到自定义配置`);
    console.log(`[build-custom]   覆盖的房间内容: ${covered.length > 0 ? covered.join(', ') : '（无）'}`);
    console.log(`[build-custom]   覆盖的房间字段: ${roomFields.length > 0 ? roomFields.join(', ') : '（无）'}`);
    if (fonts && fonts.selectedEnglish) {
        console.log(`[build-custom]   字体选择: English=${fonts.selectedEnglish} / Chinese=${fonts.selectedChinese || '（默认）'}`);
    }

    // 校验引用的资源存在性（防止打包后 404）
    const paths = extractAssetPaths(raw);
    let missing = 0;
    for (const p of paths) {
        if (!existsSync(join(ROOT, 'public', p.replace(/^\//, '')))) {
            missing++;
            console.warn(`[build-custom]   ⚠️ 引用的资源不存在（将 404）: ${p}`);
        }
    }
    if (missing > 0) {
        console.warn(`[build-custom] ⚠️  ${missing} 个引用资源缺失（多为已知的幽灵文件，如 FEATURED.webp），可忽略。`);
    } else {
        console.log(`[build-custom] ✓ 引用的 ${paths.length} 个资源全部存在。`);
    }
}

console.log('\n[build-custom] 开始构建（vite build && prune-dist-assets）…\n');

// 直接执行底层构建命令（避免递归调用 build 自身）
const r = spawnSync(
    'npm',
    ['run', 'build:core'],
    { stdio: 'inherit', shell: true, cwd: ROOT }
);
process.exit(r.status ?? 1);
