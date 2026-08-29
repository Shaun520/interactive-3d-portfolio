/**
 * Studio Content 处理模块
 *
 * 职责：把 site.config.js 中 studio.content.items 的原始条目，
 * 加工成 Studio 房间可直接消费的完整结构（补默认纹理、兜底 id）。
 *
 * 数据本身已迁到 site.config.js（rooms[].content），本文件只保留：
 *   - PLATFORM_CONFIG    平台外观配置（颜色 / 图标 / 设备形状）
 *   - buildStudioContent 把配置条目映射为完整结构（纹理轮换补默认）
 */

export const PLATFORM_CONFIG = {
    youtube: {
        color: '#FF0000',
        accentColor: '#cc0000',
        icon: '▶',
        label: 'YouTube',
        shape: 'tv', // Wide CRT style
    },
    blog: {
        color: '#4A90D9',
        accentColor: '#2d6cb5',
        icon: '📝',
        label: 'Blog',
        shape: 'monitor', // Thin desktop monitor
    },
    tiktok: {
        color: '#00F2EA',
        accentColor: '#FF0050',
        icon: '🎵',
        label: 'TikTok',
        shape: 'phone', // Vertical phone
    },
    instagram: {
        color: '#E1306C',
        accentColor: '#C13584',
        icon: '📷',
        label: 'Instagram',
        shape: 'phone',
    },
    x: {
        color: '#000000',
        accentColor: '#14171A',
        icon: '𝕏',
        label: 'X (Twitter)',
        shape: 'monitor',
    },
    linkedin: {
        color: '#0077B5',
        accentColor: '#005E93',
        icon: 'in',
        label: 'LinkedIn',
        shape: 'monitor',
    },
    codrops: {
        color: '#0099FF',
        accentColor: '#0077CC',
        icon: '💧',
        label: 'Codrops',
        shape: 'monitor',
    },
};

// 各平台默认纹理池（条目未显式写 frontTexture/paintedFrontTexture 时按平台轮换取用）
const ytTextures = ['/textures/studio/tvfront_filmikprojektdlamultiego.webp', '/textures/studio/tvfront_filmikedytowaniezdjec.webp'];
const ytPaintedTextures = ['/textures/studio/tvfront_filmikprojektdlamultiego_painted.webp', '/textures/studio/tvfront_filmikedytowaniezdjec_painted.webp'];
const blogTextures = ['/textures/studio/monitorfront_postnafbdoublewinner.webp'];
const blogPaintedTextures = ['/textures/studio/monitorfront_postnafbdoublewinner_painted.webp'];
const ttTextures = ['/textures/studio/phonefront_followmeontiktok.webp'];
const ttPaintedTextures = ['/textures/studio/phonefront_followmeontiktok_painted.webp'];

let ytIdx = 0, blogIdx = 0, ttIdx = 0;
let ytPIdx = 0, blogPIdx = 0, ttPIdx = 0;

/**
 * 把配置里的 Studio 内容条目加工为完整结构
 * @param {Array} items site.config.js 中 studio.content.items 的原始条目
 * @returns {Array} 带兜底 id 与默认纹理的完整条目
 *
 * 平台级统一封面：Blog / YouTube 的所有条目统一使用指定图片（无论条目是否显式写了
 * frontTexture，都以此为准；TikTok 等其他平台仍走默认池/条目字段）。
 * 注意：这属于默认渲染规则，不改动 site.config.js 的数据。
 */
// Blog 全条目统一封面：0 = 无色，1 = 有色
const BLOG_FRONT = '/textures/studio/studio-1787906363830-dbbxb6.png';
const BLOG_PAINTED = '/textures/studio/studio-1787906370646-lggo8j.png';
// YouTube 全条目统一封面：0 = 无色，1 = 有色
const YT_FRONT = '/textures/studio/studio-1787906990424-xcgnip.png';
const YT_PAINTED = '/textures/studio/studio-1787906995628-jvhxtt.png';

export const buildStudioContent = (items) => (items || []).map((item, i) => {
    const platform = item.platform;

    // 平台级统一封面（覆盖条目字段 / 默认池）
    if (platform === 'blog') {
        return { ...item, id: item.id || `blog-${i}`, frontTexture: BLOG_FRONT, paintedFrontTexture: BLOG_PAINTED };
    }
    if (platform === 'youtube') {
        return { ...item, id: item.id || `youtube-${i}`, frontTexture: YT_FRONT, paintedFrontTexture: YT_PAINTED };
    }

    return {
        ...item,
        id: item.id || `${platform}-${i}`,
        // 仅 TikTok 等非 Blog/YouTube 平台走默认池
        frontTexture: item.frontTexture || ttTextures[ttIdx++ % ttTextures.length],
        paintedFrontTexture: item.paintedFrontTexture || ttPaintedTextures[ttPIdx++ % ttPaintedTextures.length],
    };
});
