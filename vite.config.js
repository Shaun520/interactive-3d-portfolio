import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression';
import { generateSeoHtml } from './seo-plugin.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 开发期内容覆盖文件：编辑面板保存的 rooms[].content 覆盖，存在 public 下，
// 不被任何模块 import → 写它不会触发 HMR / 整页刷新。
const DEV_CONTENT_PATH = resolve(__dirname, 'public/site.content.dev.json');
// Gallery / Studio / About / Corridor 图片上传目录（dir 白名单）
const UPLOAD_DIRS = {
  gallery: resolve(__dirname, 'public/textures/gallery'),
  studio: resolve(__dirname, 'public/textures/studio'),
  about: resolve(__dirname, 'public/textures/about'),
  corridor: resolve(__dirname, 'public/textures/corridor'),
  entrance: resolve(__dirname, 'public/textures/entrance'),
  doors: resolve(__dirname, 'public/textures/doors'),
  sounds: resolve(__dirname, 'public/sounds'),
};
// 上传后返回的静态 URL 前缀（sounds 目录 → /sounds/，其余 → /textures/{dir}/）
const UPLOAD_URL_PREFIX = (dir) => (dir === 'sounds' ? '/sounds/' : `/textures/${dir}/`);

/**
 * 开发期实时编辑保存插件：
 * POST /__save-room-content  { roomId, content } → 合并写回 public/site.content.dev.json。
 * 写回不触发 HMR（public 静态资源），页面保持实时预览状态；
 * 下次刷新/加载时 SiteConfigProvider 会 fetch 该文件恢复覆盖内容。
 */
function saveRoomContentPlugin() {
  return {
    name: 'save-room-content',
    configureServer(server) {
      // 图片上传：POST /__upload-image { filename, data(base64), dir } → 存 public/textures/{dir}/
      server.middlewares.use('/__upload-image', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'method not allowed' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { filename, data, dir = 'gallery' } = JSON.parse(body);
            if (!filename || !data) throw new Error('filename and data are required');
            // 目录白名单：仅允许 gallery / studio
            const targetDir = UPLOAD_DIRS[dir];
            if (!targetDir) throw new Error('invalid dir');
            // 文件名安全校验：仅允许字母数字 . _ -，防路径穿越
            if (!/^[a-zA-Z0-9._-]+$/.test(filename)) throw new Error('invalid filename');
            mkdirSync(targetDir, { recursive: true });
            writeFileSync(resolve(targetDir, filename), Buffer.from(data, 'base64'));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, url: `${UPLOAD_URL_PREFIX(dir)}${filename}` }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });

      // 内容保存：POST /__save-room-content
      server.middlewares.use('/__save-room-content', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'method not allowed' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { roomId, content, fields, corridorTextures, themeFonts } = JSON.parse(body);
            if (!roomId || (content === undefined && fields === undefined && corridorTextures === undefined && themeFonts === undefined)) {
              throw new Error('roomId and content/fields are required');
            }
            // 覆盖文件结构：{ content: { roomId }, rooms: { roomId }, corridorTextures, themeFonts }
            // content 存房间内部内容；rooms 存门牌/侧/位置/贴图等房间字段
            // corridorTextures 存走廊场景贴图（地板/天花板/墙/门通用件/装饰）
            // themeFonts 存全局字体选择（selectedEnglish / selectedChinese）
            let overrides = {};
            try {
              overrides = JSON.parse(readFileSync(DEV_CONTENT_PATH, 'utf8'));
            } catch { /* 首次保存无文件 */ }
            overrides.content = overrides.content || {};
            overrides.rooms = overrides.rooms || {};
            if (content !== undefined) overrides.content[roomId] = content;
            if (fields !== undefined) overrides.rooms[roomId] = fields;
            if (corridorTextures !== undefined) overrides.corridorTextures = corridorTextures;
            if (themeFonts !== undefined) overrides.themeFonts = themeFonts;
            writeFileSync(DEV_CONTENT_PATH, JSON.stringify(overrides, null, 2));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteCompression(), generateSeoHtml(), saveRoomContentPlugin()],
})
