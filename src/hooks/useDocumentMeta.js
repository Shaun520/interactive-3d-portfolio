import { useEffect, useRef } from 'react';
import { useScene } from '../context/SceneContext';
import { siteConfig } from '../site.config';

/**
 * useDocumentMeta — Dynamic Meta Tags & Virtual Routing (History API)
 *
 * 由 site.config.js 动态生成 ROOM_META 与 PATH_TO_ROOM：
 *   - brand.domain → canonical / og:url 域名
 *   - seo → 走廊页（null）的 title / description
 *   - rooms[].meta（或兜底 rooms[].label）→ 各房间的 title / description
 *
 * 因此改名、改域名、增删房间后，SEO 与虚拟路由会自动同步，无需改本文件。
 */

const { brand, seo } = siteConfig;

// 走廊页
const ROOM_META = {
    null: {
        path: '/',
        title: seo.title,
        description: seo.description,
    },
};

// 由配置生成各房间 meta
siteConfig.rooms.forEach((room) => {
    ROOM_META[room.id] = {
        path: room.path,
        title: room.meta?.title || `${room.label} — ${brand.name}`,
        description: room.meta?.description || seo.description,
    };
});

// Map URL paths back to room IDs for deep linking
const PATH_TO_ROOM = { '/': null };
siteConfig.rooms.forEach((room) => {
    PATH_TO_ROOM[room.path] = room.id;
});

const SITE_URL = brand.domain.replace(/\/+$/, '');

/**
 * Returns the room ID that the initial URL points to (for deep linking).
 * Call this once at app startup to determine if we need to auto-teleport.
 *
 * 规则：深链接只在「本会话首次访问」该房间 URL 时生效；
 * 刷新 / 恢复标签页（URL 残留上次房间）时回到走廊，并清掉 URL 中的房间路径，
 * 避免启动时被自动拽进上次进入的房间。
 */
export function getInitialRoomFromUrl() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const room = PATH_TO_ROOM[path] !== undefined ? PATH_TO_ROOM[path] : null;
    if (room) {
        if (sessionStorage.getItem('deepLinkConsumed')) {
            // 已是本会话内刷新/恢复：回到走廊，URL 清到根路径
            history.replaceState({}, '', '/');
            return null;
        }
        sessionStorage.setItem('deepLinkConsumed', '1');
    }
    return room;
}

export function useDocumentMeta() {
    const { currentRoom, teleportTo, hasEntered } = useScene();
    const isHandlingPopState = useRef(false);
    const lastPushedRoom = useRef(undefined); // Track what we last pushed to avoid duplicates

    // Update document meta and URL when room changes
    useEffect(() => {
        const roomKey = currentRoom === null ? 'null' : currentRoom;
        const meta = ROOM_META[roomKey] || ROOM_META['null'];

        // Update the page title
        document.title = meta.title;

        // Update meta description
        const descTag = document.querySelector('meta[name="description"]');
        if (descTag) {
            descTag.setAttribute('content', meta.description);
        }

        // Update OG meta tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', meta.title);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', meta.description);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', `${SITE_URL}${meta.path}`);

        // Update canonical link to ensure virtual routes are correctly indexable as separate pages
        const canonicalTag = document.querySelector('link[rel="canonical"]');
        if (canonicalTag) {
            canonicalTag.setAttribute('href', `${SITE_URL}${meta.path}`);
        }

        // Push to browser history (only if not handling a popstate event and room actually changed)
        if (!isHandlingPopState.current && lastPushedRoom.current !== currentRoom) {
            // Use replaceState for the very first load, pushState for subsequent navigations
            if (lastPushedRoom.current === undefined) {
                window.history.replaceState({ room: currentRoom }, '', meta.path);
            } else {
                window.history.pushState({ room: currentRoom }, '', meta.path);
            }
            lastPushedRoom.current = currentRoom;
        }

        isHandlingPopState.current = false;
    }, [currentRoom]);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = (event) => {
            isHandlingPopState.current = true;
            const targetRoom = event.state?.room ?? null;
            lastPushedRoom.current = targetRoom;

            if (targetRoom === null) {
                // Going back to corridor — we don't teleport, just need to trigger exit
                // The SceneContext requestExit will handle the animation
                // For now, we update meta immediately
                const meta = ROOM_META['null'];
                document.title = meta.title;
            } else if (hasEntered) {
                // Teleport to the target room
                teleportTo(targetRoom);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [teleportTo, hasEntered]);
}
