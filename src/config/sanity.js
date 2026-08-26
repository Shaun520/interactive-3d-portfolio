import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

export const sanityClient = createClient({
    projectId: 'kv5wjjmj', // 在 Sanity 创建项目后填写
    dataset: 'production',
    useCdn: true, // `false` 用于开发环境，`true` 用于生产环境以加快速度
    apiVersion: '2024-03-01', // 当前 API 日期
});

const builder = createImageUrlBuilder(sanityClient);

// 辅助函数：从 Sanity 生成图片 URL
export const urlFor = (source) => builder.image(source);

// 辅助函数：把 Sanity 域名替换为 Cloudflare 代理
export const getProxyUrl = (imageBuilder) => {
    if (!imageBuilder) return null;
    const url = imageBuilder.url();
    if (url && typeof window !== 'undefined') {
        return url.replace('https://cdn.sanity.io', '/sanity-cdn');
    }
    return url;
};
