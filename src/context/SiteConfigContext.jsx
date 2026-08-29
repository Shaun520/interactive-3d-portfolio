import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { siteConfig } from '../site.config';
import { resolveFonts } from '../fonts/fontCatalog';

/**
 * =============================================================================
 * SiteConfigContext — 全站配置上下文
 * =============================================================================
 *
 * 统一暴露站点配置（site.config.js）。
 * rooms[].content 为可变状态：实时编辑面板通过 updateRoomContent 修改，
 * 房间组件重渲染后 3D 文本即时反映，点「保存」写回 site.config.js 持久化。
 *
 * 用法：
 *   const { brand, seo, theme, rooms, updateRoomContent } = useSiteConfig();
 *   const rooms = useRooms();
 *   const theme = useTheme();
 * =============================================================================
 */

const SiteConfigContext = createContext(null);

export const useSiteConfig = () => {
    const ctx = useContext(SiteConfigContext);
    if (!ctx) {
        throw new Error('useSiteConfig must be used within a SiteConfigProvider');
    }
    return ctx;
};

/** 便捷：房间列表（content 可变） */
export const useRooms = () => useSiteConfig().rooms;

/** 便捷：主题配置 */
export const useTheme = () => useSiteConfig().theme;

/**
 * 走廊门的世界 Z 坐标计算（与 TeleportRoom 公式一致）
 * 门中心 = corridor.startZ + relativeZ + 2（门偏移）
 */
export const resolveDoorZ = (relativeZ) => siteConfig.corridor.startZ + relativeZ + 2;

export const SiteConfigProvider = ({ children }) => {
    // 房间可变状态：默认取配置初始值，实时编辑面板通过 updateRoom / updateRoomContent 修改
    const [rooms, setRooms] = useState(() => siteConfig.rooms);

    // 首页（走廊欢迎区）可变内容：标题 / 副标题 / 头像帧
    const [homeContent, setHomeContent] = useState(() => siteConfig.home?.content);

    // 屋外（点击进门前的 PORTFOLIO 入口）可变内容：木牌字 / 提示条 / 贴图
    const [outdoorContent, setOutdoorContent] = useState(() => siteConfig.outdoor?.content);

    // 走廊场景贴图（地板 / 天花板 / 墙 / 门通用件 / 装饰），编辑面板可换
    const [corridorTextures, setCorridorTextures] = useState(() => siteConfig.corridor?.textures);

    // 全局字体选择的 id（英文 / 中文），编辑面板「字体」tab 修改；解析后的实际 URL 见下方 resolveFonts
    const [selectedFonts, setSelectedFonts] = useState(() => ({
        selectedEnglish: siteConfig.theme?.fonts?.selectedEnglish,
        selectedChinese: siteConfig.theme?.fonts?.selectedChinese,
    }));

    // 加载「编辑面板」保存的覆盖（public/site.content.dev.json）。
    // 该文件在构建时会被复制进 dist，因此生产环境同样加载——
    // 使「编辑面板保存的内容/贴图/字体选择」在打包产物中生效（而非默认配置）。
    // 结构：{ content: { roomId: {...} }, rooms: { roomId: { label, side, ... } } }
    //
    // 合并策略：以 site.config.js 的默认值为底，dev.json 中存在的字段浅覆盖
    // → 新增字段（如 textures.doorLeft/doorRight/window）即使 dev.json 旧版没存，
    //    也不会被「整体替换」清掉；用户改过的字段（sign / music / 已存过的贴图）正常生效。
    useEffect(() => {
        let cancelled = false;
        // dev 下加时间戳绕开 vite 静态缓存（保存后刷新拿最新）；生产用 CDN 缓存即可
        const qs = import.meta.env.DEV ? `?t=${Date.now()}` : '';
        fetch(`/site.content.dev.json${qs}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data) return;
                const contentMap = data.content || {};
                const roomMap = data.rooms || {};
                if (contentMap.home !== undefined) {
                    setHomeContent((prev) => ({ ...(prev || {}), ...contentMap.home }));
                }
                if (contentMap.outdoor !== undefined) {
                    setOutdoorContent((prev) => {
                        const base = prev || siteConfig.outdoor?.content || {};
                        const override = contentMap.outdoor || {};
                        return {
                            ...base,
                            ...override,
                            // textures 内部也做浅合并：新加的 key 不丢
                            textures: { ...(base.textures || {}), ...(override.textures || {}) },
                        };
                    });
                }
                if (contentMap.corridorTextures !== undefined) {
                    setCorridorTextures((prev) => {
                        const base = prev || siteConfig.corridor?.textures || {};
                        return { ...base, ...(contentMap.corridorTextures || {}) };
                    });
                }
                // 全局字体选择恢复（themeFonts 键）
                // 保存时写到 JSON 顶层 themeFonts（见 vite.config saveRoomContentPlugin），不是 data.content 里
                const savedFonts = data.themeFonts || contentMap.themeFonts;
                if (savedFonts !== undefined && savedFonts.selectedEnglish !== undefined) {
                    setSelectedFonts((prev) => ({ ...prev, ...savedFonts }));
                }
                setRooms((prev) => prev.map((r) => {
                    let next = r;
                    if (contentMap[r.id] !== undefined) {
                        next = { ...next, content: { ...(next.content || {}), ...contentMap[r.id] } };
                    }
                    if (roomMap[r.id] !== undefined) {
                        next = { ...next, ...roomMap[r.id] };
                    }
                    return next;
                }));
            })
            .catch(() => { /* 无覆盖文件时忽略 */ });
        return () => { cancelled = true; };
    }, []);

    /**
     * 更新某个房间的任意字段（实时预览用，门牌/侧/位置/贴图/内容等）
     * @param {string} roomId 房间 id
     * @param {object|Function} updater 新字段对象（浅合并），或 (prevRoom) => newRoom 函数
     */
    const updateRoom = useCallback((roomId, updater) => {
        setRooms(prev => prev.map(r => r.id === roomId
            ? (typeof updater === 'function' ? updater(r) : { ...r, ...updater })
            : r));
    }, []);

    /**
     * 更新某个房间的 content（实时预览用）
     * @param {string} roomId 房间 id
     * @param {object|Function} updater 新 content 对象，或 (prevContent) => newContent 函数
     */
    const updateRoomContent = useCallback((roomId, updater) => {
        setRooms(prev => prev.map(r => r.id === roomId
            ? { ...r, content: typeof updater === 'function' ? updater(r.content) : updater }
            : r));
    }, []);

    /**
     * 更新首页（走廊欢迎区）内容（实时预览用）
     */
    const updateHomeContent = useCallback((updater) => {
        setHomeContent(prev => (typeof updater === 'function' ? updater(prev) : updater));
    }, []);

    /**
     * 更新屋外（PORTFOLIO 入口）内容（实时预览用）
     */
    const updateOutdoorContent = useCallback((updater) => {
        setOutdoorContent(prev => (typeof updater === 'function' ? updater(prev) : updater));
    }, []);

    /**
     * 更新走廊场景贴图（实时预览用）
     * @param {string|Function} key 贴图 key，或 (prev) => newTextures 函数
     * @param {string} [url] key 对应的新贴图路径
     */
    const updateCorridorTexture = useCallback((key, url) => {
        setCorridorTextures(prev =>
            typeof key === 'function'
                ? key(prev)
                : { ...(prev || {}), [key]: url }
        );
    }, []);

    /**
     * 更新全局字体选择（实时预览用）
     * @param {'selectedEnglish'|'selectedChinese'} field
     * @param {string} fontId fontCatalog 里的 id
     */
    const updateThemeFont = useCallback((field, value) => {
        setSelectedFonts((prev) => ({ ...prev, [field]: value }));
    }, []);

    // 编辑面板「当前聚焦的 Studio 条目 id」：StudioRoom 据此把监视器塔定位到该条目
    const [studioFocusId, setStudioFocusId] = useState(null);
    // 预览区选中的 Studio 条目 id：仅用于右侧编辑区同步选中下标，
    // 不触发转塔定位 / 不显示聚焦边框（与 studioFocusId 相互独立）
    const [previewSelectedId, setPreviewSelectedId] = useState(null);

    // 解析选中的字体 id → 实际 3D URL 与 DOM css（供各消费点使用）
    const resolvedFonts = useMemo(
        () => resolveFonts(selectedFonts.selectedEnglish, selectedFonts.selectedChinese),
        [selectedFonts.selectedEnglish, selectedFonts.selectedChinese]
    );

    // 按内容自动选字体：含中日韩字符 → 中文字体；否则 → 英文字体（全局统一判断）
    const fontForText = useCallback((text) => {
        const s = String(text ?? '');
        return /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(s)
            ? resolvedFonts.chineseFont3D
            : resolvedFonts.englishFont3D;
    }, [resolvedFonts.englishFont3D, resolvedFonts.chineseFont3D]);

    // DOM 版同上：返回所选字体的 font-family 字符串（供弹窗等 DOM 文本按内容换字）
    const fontForDom = useCallback((text) => {
        const s = String(text ?? '');
        return /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(s)
            ? resolvedFonts.domCss
            : (resolvedFonts.englishDomCss || "'Cabin Sketch', cursive");
    }, [resolvedFonts.domCss, resolvedFonts.englishDomCss]);

    // 全局 DOM 字体跟随：把选中的字体族写到 body，让所有 DOM 文字随字体选择变化
    useEffect(() => {
        document.body.style.fontFamily = resolvedFonts.domCss;
    }, [resolvedFonts.domCss]);

    const value = useMemo(
        () => ({ ...siteConfig, rooms, updateRoom, updateRoomContent, homeContent, updateHomeContent, outdoorContent, updateOutdoorContent, corridorTextures, updateCorridorTexture, studioFocusId, setStudioFocusId, previewSelectedId, setPreviewSelectedId, selectedFonts, updateThemeFont, ...resolvedFonts, fontForText, fontForDom }),
        [rooms, updateRoom, updateRoomContent, homeContent, updateHomeContent, outdoorContent, updateOutdoorContent, corridorTextures, updateCorridorTexture, studioFocusId, setStudioFocusId, previewSelectedId, setPreviewSelectedId, selectedFonts, updateThemeFont, resolvedFonts, fontForText, fontForDom]
    );

    return (
        <SiteConfigContext.Provider value={value}>
            {children}
        </SiteConfigContext.Provider>
    );
};

export default SiteConfigContext;
