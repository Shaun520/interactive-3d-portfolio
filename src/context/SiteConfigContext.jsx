import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { siteConfig } from '../site.config';

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

    // DEV：加载「编辑面板」保存的覆盖（public/site.content.dev.json）。
    // 保存不刷新页面，靠这里在下次刷新/重新加载时恢复持久化的内容；
    // 结构：{ content: { roomId: {...} }, rooms: { roomId: { label, side, ... } } }
    // 生产构建忽略（不 fetch，使用 site.config.js 默认值）。
    //
    // 合并策略：以 site.config.js 的默认值为底，dev.json 中存在的字段浅覆盖
    // → 新增字段（如 textures.doorLeft/doorRight/window）即使 dev.json 旧版没存，
    //    也不会被「整体替换」清掉；用户改过的字段（sign / music / 已存过的贴图）正常生效。
    useEffect(() => {
        if (!import.meta.env.DEV) return;
        let cancelled = false;
        fetch('/site.content.dev.json')
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

    // 编辑面板「当前聚焦的 Studio 条目 id」：StudioRoom 据此把监视器塔定位到该条目
    const [studioFocusId, setStudioFocusId] = useState(null);

    const value = useMemo(
        () => ({ ...siteConfig, rooms, updateRoom, updateRoomContent, homeContent, updateHomeContent, outdoorContent, updateOutdoorContent, corridorTextures, updateCorridorTexture, studioFocusId, setStudioFocusId }),
        [rooms, updateRoom, updateRoomContent, homeContent, updateHomeContent, outdoorContent, updateOutdoorContent, corridorTextures, updateCorridorTexture, studioFocusId]
    );

    return (
        <SiteConfigContext.Provider value={value}>
            {children}
        </SiteConfigContext.Provider>
    );
};

export default SiteConfigContext;
