/**
 * =============================================================================
 * SITE CONFIG — 通用化配置主入口
 * =============================================================================
 *
 * 这是整个项目的「唯一」配置源。改这里 = 改全站。
 *
 * 你可以：
 *  1. 改 brand / seo → 品牌名、域名、SEO、控制台签名
 *  2. 改 theme      → 配色、字体、素材路径（保留默认手绘风格，或整体换肤）
 *  3. 改 rooms      → 房间可改名、换门牌、换地图位置、换门面贴图（固定 4 间），
 *                     房间内容（gallery/studio/about）在 rooms[].content 里直接配置
 *
 * 数据变更后无需改任何组件代码。房间「类型」由 rooms[].type 决定，
 * 类型与 3D 房间组件的映射见 src/config/rooms/registry.js。
 *
 * ⚠️ 版权提示：默认素材（手绘黑白图）为原作者私有版权，仅供参考演示。
 *    正式使用时请把 theme.assets 与 rooms[].textures 替换为你自己的素材。
 * =============================================================================
 */

const DEFAULT_THEME_ID = 'hand-drawn';

const baseSiteConfig = {
    // =====================================================================
    // 品牌 (Brand)
    // =====================================================================
    brand: {
        name: 'ITom',
        displayName: 'ITom',
        tagline: 'Creative 3D Portfolio',
        author: 'Tomasz Szmajda',
        domain: 'https://itomdev.com', // 用于 canonical / og:url
        favicon: '/favico.png',
        console: {
            title: 'TOM KING',
            subtitle: 'PORTFOLIO',
            color: '#f33',
            message: 'Hi! Check out the code quality. Clean console = happy dev.',
        },
    },

    // =====================================================================
    // SEO（默认值；每个房间可用 rooms[].meta 单独覆盖）
    // =====================================================================
    seo: {
        title: 'ITom — Creative 3D Portfolio',
        description:
            'Interactive 3D developer portfolio by Tomasz "ITom" Szmajda. Explore WebGL experiments, React projects & GSAP animations in a hand-drawn gallery.',
        keywords: [
            'Tomasz Szmajda', 'ITom', 'Tomasz ITom Szmajda',
            'web developer portfolio', '3D web development', 'Three.js developer',
            'React portfolio', 'frontend engineer',
        ],
        robots: 'index, follow',
    },

    // =====================================================================
    // 主题 (Theme) — 视觉主题处理
    //   1. 保留默认手绘风格（theme.id 默认 hand-drawn）
    //   2. colors   → 配色（同时写入 CSS 变量与 3D 场景背景/雾色）
    //   3. fonts    → 3D 标题字体 / DOM 正文字体
    //   4. assets   → 素材替换：把任意路径换成你自己的资源即可整体换肤
    // =====================================================================
    theme: {
        id: DEFAULT_THEME_ID,
        label: 'Hand-drawn sketch (default)',

        colors: {
            background: '#fafafa', // 3D 场景清屏色 + CSS --color-bg
            ink: '#1a1a1a',        // 主文字色 + CSS --color-ink
            paper: '#faf8f5',      // 纸感底色 + CSS --color-paper
            accent: '#e33',        // 强调色 + CSS --color-accent
            fog: '#fafafa',        // 3D 雾色
            wallTint: '#e0e0e0',   // 走廊墙面基础染色
            roomFloor: '#e5e5e5',
            roomCeiling: '#fafafa',
            roomWall: '#f0f0f0',
            roomBackWall: '#f5f5f5',
        },

        fonts: {
            display3D: '/fonts/CabinSketch-Bold.ttf', // drei <Text> 使用的字体
            body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", // DOM 字体
        },

        // 素材替换（Material Replacement）
        // 这里列出的都是「全局单点」素材；房间专属门贴图见 rooms[].textures
        assets: {
            // 场景背景纸
            paperTexture: '/textures/paper-texture.webp',

            // 入口
            entranceSign: '/textures/entrance/sign.webp',
            entranceMount: '/textures/entrance/belka.webp',

            // 走廊基础
            wallTexture: '/textures/corridor/wall_texture.webp',
            floorTexture: '/textures/corridor/kawalekpodlogi.webp',
            ceilingTexture: '/textures/corridor/ceiling_texture.webp',
            baseboardTexture: '/textures/corridor/texturadoprogow.webp',
            emptySignTexture: '/textures/corridor/pustatabliczka.webp',
            arrowTexture: '/textures/corridor/strzalka.webp',

            // 门通用件
            doorFrameTexture: '/textures/corridor/doors/ramkasingledoors.webp',
            doorHandleTexture: '/textures/corridor/doors/klamkadodrzwi.webp',
            doorHandlePaintedTexture: '/textures/corridor/doors/klamkadodrzwi_painted.webp',
            doorBackTexture: '/textures/corridor/doors/backsingledoors.webp',

            // 地图 UI
            map: '/images/map.webp',
            pin: '/images/pin.webp',
            pinSlot: '/images/pin-slot.webp',
        },
    },

    // =====================================================================
    // 走廊 (Corridor) — 无限走廊的段参数
    // =====================================================================
    // 走廊是无限循环的：按「段」重复渲染，每一段里出现所有房间的门。
    //   segmentLength  每段长度（单位）。所有房间的 relativeZ 必须落在
    //                   0 ~ -segmentLength 之间，否则会与下一段的门重叠。
    //   startZ         段 0 的起点 Z（通常不动，保持 10 与入口对齐）
    corridor: {
        segmentLength: 80,
        startZ: 10,
        // 走廊场景贴图（编辑面板「走廊」tab 可换，缺省回退到下面路径）
        textures: {
            // 基础场景
            floor: '/textures/corridor/kawalekpodlogi.webp',
            ceiling: '/textures/corridor/ceiling_texture.webp',
            wall: '/textures/corridor/wall_texture.webp',
            baseboard: '/textures/corridor/texturadoprogow.webp',
            // 壁画相框（大框草图 / 大框上色 / 立式小框）
            frame: '/textures/corridor/ramkanazdjecieduza.webp',
            framePainted: '/textures/corridor/ramkanazdjecieduza_painted.webp',
            standingFrame: '/textures/corridor/ramkanazdjeciemala.webp',
            // 装饰（树 / 通风口 / 花）
            tree: '/textures/corridor/drzewkowdoniczce.webp',
            grate: '/textures/corridor/kratkawentylacyjna.webp',
            flower: '/textures/corridor/kwiatekwdoniczce.webp',
            // 吊灯
            lampGrille: '/textures/corridor/kratanalampy.webp',
            lampSide: '/textures/corridor/bokilampy.webp',
            // 桌子 + 柜子
            wood: '/textures/corridor/texturadrewnadonozekbiurka.webp',
            tableTop: '/textures/corridor/gorastolika.webp',
            cabinetFront: '/textures/corridor/szafkaprzod.webp',
            cabinetRest: '/textures/corridor/szafkaprzodgora.webp',
            // 走廊门通用件（门框 / 把手 / 把手激活 / 门背 / 箭头 / 空白门牌）
            doorFrame: '/textures/corridor/doors/ramkasingledoors.webp',
            doorHandle: '/textures/corridor/doors/klamkadodrzwi.webp',
            doorHandlePainted: '/textures/corridor/doors/klamkadodrzwi_painted.webp',
            doorBack: '/textures/corridor/doors/backsingledoors.webp',
            arrow: '/textures/corridor/strzalka.webp',
            emptySign: '/textures/corridor/pustatabliczka.webp',
            // 段末大门（双扇）
            segFrame: '/textures/corridor/doors/frame_sketch.webp',
            segDoorLeft: '/textures/corridor/doors/doorrleft.webp',
            segDoorRight: '/textures/corridor/doors/dorright.webp',
            segHandleLeft: '/textures/corridor/doors/handle_left_sketch.webp',
            segHandleRight: '/textures/corridor/doors/handle_right_sketch.webp',
            segDoorBack: '/textures/corridor/doors/door_back.webp',
            segEdge: '/textures/corridor/doors/pien.webp',
            // 段末门旁墙面装饰
            decorWhileTrue: '/textures/corridor/decorations/while_true_loop.webp',
            decorCoffee: '/textures/corridor/decorations/coffee_debug.webp',
            decorIdea: '/textures/corridor/decorations/idea_process.webp',
        },
    },

    // =====================================================================
    // 首页 (Home) — 走廊入口的欢迎区内容
    //   title        主标题（HeroText，逐字母拆开做分裂动画）
    //   tagline      副标题（一行小字）
    //   avatarFrames 头像动画帧（>1 张按 ping-pong 播放挥手动画；只留 1 张则静态显示）
    // =====================================================================
    home: {
        content: {
            title: 'ITOM',
            tagline: '< creative developer />',
            avatarFrames: [
                '/textures/corridor/avatar_anim/1.webp',
                '/textures/corridor/avatar_anim/2.webp',
                '/textures/corridor/avatar_anim/3.webp',
                '/textures/corridor/avatar_anim/4.webp',
                '/textures/corridor/avatar_anim/5.webp',
                '/textures/corridor/avatar_anim/6.webp',
                '/textures/corridor/avatar_anim/7.webp',
                '/textures/corridor/avatar_anim/8.webp',
                '/textures/corridor/avatar_anim/9.webp',
            ],
            // 走廊壁画（墙上画框）。relZ = 相对本段起始的 Z 位置（离段首越近越小）。
            // image 为空 → 画框内无图；signature 为空 → 不显示签名。
            // 默认 2 张；编辑器「走廊」tab 可新增（最多 4 张）或删除整张。
            frames: [
                {
                    id: 'frame-1',
                    relZ: 10,
                    side: 'right',
                    width: 2.5,
                    height: 2.5 / 1.785,
                    y: 0.3,
                    offsetFromWall: 0.1,
                    image: '/textures/corridor/rysuneknaobraz1.webp',
                    imageWidth: 1.1,
                    imageHeight: 1.1,
                    signature: '',
                },
                {
                    id: 'frame-2',
                    relZ: 25,
                    side: 'left',
                    width: 2.5,
                    height: 2.5 / 1.785,
                    y: 0.2,
                    offsetFromWall: 0.1,
                    image: '/textures/corridor/rysuneknaobrazek3.webp',
                    imageWidth: 1.7,
                    imageHeight: 1,
                    signature: '',
                },
            ],
        },
    },

    // =====================================================================
    // 屋外 (Outdoor) — 点击进门前的那一面「PORTFOLIO」入口
    //   sign         木牌上的大字（默认 PORTFOLIO，按下划线切两行）
    //   tutorialTitle  提示条大标题（默认 EXPLORER）
    //   tutorialLabel  提示条小字（默认 "Click a door to enter"）
    //   textures     入口场景的 6 个可换贴图
    // =====================================================================
    outdoor: {
        content: {
            sign: 'PORTFOLIO',
            tutorialTitle: 'EXPLORER',
            tutorialLabel: 'Click a door to enter. Audio is currently',
            // 点击爬虫后的提示文字
            bugText: 'BUG FIXED!',
            // 背景音乐：点击门进入时播放（屋外编辑器可上传替换）
            music: '/sounds/cfl_turningpages-belem-breeze-487596.ogg',
            textures: {
                sign: '/textures/entrance/sign.webp',
                frame: '/textures/doors/frame_sketch.webp',
                // 门（左右两扇，可分别替换）
                doorLeft: '/textures/doors/door_left_sketch.webp',
                doorRight: '/textures/doors/door_right_sketch.webp',
                // 激活态门（悬停/打开后显示的上色版）
                doorLeftPainted: '/textures/doors/door_left_painted.webp',
                doorRightPainted: '/textures/doors/door_right_painted.webp',
                // 门把手（草图 + 上色激活态）
                handleLeft: '/textures/doors/handle_left_sketch.webp',
                handleRight: '/textures/doors/handle_right_sketch.webp',
                handleLeftPainted: '/textures/doors/handle_left_painted.webp',
                handleRightPainted: '/textures/doors/handle_right_painted.webp',
                // 窗户贴图（草图版，被涂色后变成 avatar_window）
                window: '/textures/entrance/window_sketch.webp',
                // 窗户内的小人物
                avatarWindow: '/textures/entrance/avatar_window.webp',
                // 小猫 / 悬挂鼠标 / 爬虫 / 点击爬虫的墨水效果
                catFrontBody: '/textures/entrance/cat_front_body.webp',
                mouseHanging: '/textures/entrance/mouse_hanging.webp',
                bug: '/textures/entrance/bug_sketch.webp',
                inkSplash: '/images/ink-splash.webp',
                brickWall: '/textures/entrance/wall_bricks_2.webp',
                stonePath: '/textures/entrance/stone-path.webp',
                tree: '/textures/entrance/tree_sketch.webp',
                potDuck: '/textures/entrance/pot_with_duck.webp',
            },
        },
    },

    // =====================================================================
    // 房间 (Rooms) — 房间可插拔
    // =====================================================================
    // 字段说明：
    //   id            房间唯一 ID（路由 / URL / 传送 / 地图共用）
    //   type          房间类型 → 3D 组件（见 registry.js；内置 gallery/studio/about/contact/generic）
    //   label         门牌文字 + 地图标签（改它，门牌与地图同步变）
    //   shortLabel    地图 / UI 短名
    //   path          虚拟路由
    //   side          门在走廊哪一侧：'left' | 'right'
    //   relativeZ     门在该走廊段内的相对 Z（段起点 Z=startZ，越靠后越负）
    //                   不写则自动布局（填入手动门之间的空隙）
    //   sign          门牌排版：{ style:'two-line'|'single', lines?, fontSize }
    //                   two-line 默认把 label 按空格拆两行，lines 可覆盖
    //   textures.door / textures.doorPainted   门面贴图（素描 / 上色）
    //   map           地图 UI：x/y 图钉坐标（不写则自动分配空白格）、
    //                   paintedImage、clipPath 高亮裁剪、labelPos
    //   meta          SEO 覆盖
    //   content       该房间的本地内容（不同房间类型结构不同，见各房间文档）
    rooms: [
        {
            id: 'gallery',
            type: 'gallery',
            label: 'THE GALLERY',
            shortLabel: 'Gallery',
            path: '/gallery',
            side: 'left',
            relativeZ: -18,
            icon: '◈',
            color: '#f5efe6',
            enterDistance: 8,
            // 门牌文字 = label（two-line 样式按空格自动拆两行，sign.lines 可覆盖）
            sign: { style: 'two-line', fontSize: 0.25 },
            textures: {
                door: '/textures/corridor/doors/drzwiprojekty.webp',
                doorPainted: '/textures/corridor/doors/drzwiprojekty_painted.webp',
            },
            map: {
                x: 43, y: 72,
                paintedImage: '/images/map_gallery_painted.webp',
                clipPath: 'polygon(10% 57%, 40% 57%, 40% 92%, 10% 92%)',
                labelPos: { x: 26, y: 94 },
            },
            subtitle: 'Explore my creative projects',
            meta: {
                title: 'Gallery & Projects — ITom Portfolio',
                description:
                    'Browse the interactive 3D gallery of web development projects by ITom. Each project is displayed as a hand-drawn card you can flip and explore.',
            },
            content: {
                // Gallery 项目卡片（改这里，实时编辑面板保存后也会刷新此房间内容）
                projects: [
                    {
                        id: 'monetune',
                        title: 'MONETUNE',
                        front: '/textures/gallery/monetuneprzod.webp',
                        painted: '/textures/gallery/monetuneprzod_painted.webp',
                        url: 'https://monetune.pl',
                        description: 'MoneTune is a step-by-step blueprint that teaches beginners how to generate passive income using AI-created music. Without any musical skills, you will learn how to easily produce professional tracks, publish them on platforms like Spotify, and monetize your digital assets.',
                        techStack: ['/textures/gallery/wordpresslogo.webp', '/textures/gallery/elementorlogo.webp', '/textures/gallery/phplogo.webp', '/textures/gallery/csslogo.webp'],
                    },
                    {
                        id: 'timber',
                        title: 'TIMBERKITTY',
                        front: '/textures/gallery/timberkittyprzod.webp',
                        painted: '/textures/gallery/timberkittyprzod_painted.webp',
                        url: 'https://timberkitty.netlify.app',
                        description: 'TimberKitty is an addictive, free-to-play browser arcade game built in pure JavaScript. Players control a lumberjack cat to chop wood, save birds, complete daily missions, and compete on global leaderboards.',
                        techStack: ['/textures/gallery/jslogo.webp', '/textures/gallery/htmllogo.webp', '/textures/gallery/csslogo.webp', '/textures/gallery/firebaselogo.webp'],
                    },
                    {
                        id: 'young',
                        title: 'YOUNG MULTI',
                        front: '/textures/gallery/youngmultiprzod.webp',
                        painted: '/textures/gallery/youngmultiprzod_painted.webp',
                        url: 'https://young-multi-strona.netlify.app',
                        description: 'A sleek, modern concept website dedicated to the Polish rapper and creator Young Multi. It serves as a promotional landing page designed to highlight his personal brand, music, and online presence.',
                        techStack: ['/textures/gallery/reactlogo.webp', '/textures/gallery/tailwindlogo.webp', '/textures/gallery/htmllogo.webp', '/textures/gallery/netlifylogo.webp'],
                    },
                    {
                        id: 'bio',
                        title: 'BIO',
                        front: '/textures/gallery/bioprzod.webp',
                        painted: '/textures/gallery/bioprzod_painted.webp',
                        url: 'https://tomkingbio.netlify.app',
                        description: 'A fast, modern personal bio page serving as a central hub for my digital footprint. It showcases my latest coding projects, web development services, YouTube videos, and recommended music artists.',
                        techStack: ['/textures/gallery/htmllogo.webp', '/textures/gallery/csslogo.webp', '/textures/gallery/jslogo.webp', '/textures/gallery/netlifylogo.webp'],
                    },
                ],
            },
        },
        {
            id: 'studio',
            type: 'studio',
            label: 'THE STUDIO',
            shortLabel: 'Studio',
            path: '/studio',
            side: 'right',
            relativeZ: -32,
            icon: '▶',
            color: '#e6f5ef',
            enterDistance: 8,
            sign: { style: 'two-line', fontSize: 0.25 },
            doorRatio: 0.388,          // 门宽高比（studio 门贴图比例特殊）
            flipPaintedOnRight: false, // 右侧门的上色层不镜像（studio 特例）
            textures: {
                door: '/textures/corridor/doors/drzwisocial.webp',
                doorPainted: '/textures/corridor/doors/drzwisocial_painted.webp',
            },
            map: {
                x: 57, y: 55,
                paintedImage: '/images/map_studio_painted.webp',
                clipPath: 'polygon(60% 41%, 85% 41%, 85% 81%, 60% 81%)',
                labelPos: { x: 72, y: 75 },
            },
            subtitle: 'Watch behind the scenes',
            meta: {
                title: 'The Studio — ITom Portfolio',
                description:
                    "Explore ITom's content studio — YouTube videos, blog posts, and TikToks displayed on floating monitors in an immersive 3D space.",
            },
            content: {
                // Studio 内容（原来在 contentData.js 的 RAW_CONTENT_DATA，迁到配置统一管理）
                // 改这里保存后自动刷新预览。纹理缺省时由 buildStudioContent 按平台轮换补默认
                items: [
                    // ============ YouTube Videos ============
                    { id: 'yt-001', platform: 'youtube', title: 'I Built a Website for Young Multi for $__,___', description: 'It\'s late 2025, we\'re flying to space, and Young Multi... still didn\'t have his own website. So I took matters into my own hands.', frontTexture: '/textures/studio/tvfront_filmikprojektdlamultiego.webp', paintedFrontTexture: '/textures/studio/tvfront_filmikprojektdlamultiego_painted.webp', thumbnail: null, url: 'https://www.youtube.com/watch?v=AOz4fB7NV_I&t=21s', date: '2026-01-10', views: '1.2K', duration: '15:32' },
                    { id: 'yt-002', platform: 'youtube', title: 'Turning an ordinary selfie into a professional AI photoshoot! How Google Nano Banana transformed my photo! (For Free)', description: '📸 Watch how I turned a basic selfie into a professional photoshoot using a free AI tool from Google! In this step-by-step tutorial, I reveal my secret trick for crafting perfect prompts, even if you\'re a total beginner.', frontTexture: '/textures/studio/tvfront_filmikedytowaniezdjec.webp', paintedFrontTexture: '/textures/studio/tvfront_filmikedytowaniezdjec_painted.webp', thumbnail: null, url: 'https://www.youtube.com/watch?v=WQTOD7uXHNY&t=10s', date: '2025-10-11', views: '121', duration: '7:45' },
                    { id: 'yt-003', platform: 'youtube', title: 'React Three Fiber Crash Course', description: 'Everything you need to know to get started with 3D in React.', thumbnail: null, url: 'https://www.youtube.com/@itompoland', date: '2025-12-28', views: '2.4K', duration: '22:10' },
                    { id: 'yt-004', platform: 'youtube', title: 'Shaders for Beginners', description: 'Introduction to GLSL shaders in WebGL and Three.js.', thumbnail: null, url: 'https://www.youtube.com/@itompoland', date: '2025-12-15', views: '1.8K', duration: '18:33' },
                    { id: 'yt-005', platform: 'youtube', title: 'GSAP + Three.js Integration', description: 'How to animate 3D objects with GSAP ScrollTrigger.', thumbnail: null, url: 'https://www.youtube.com/@itompoland', date: '2025-12-01', views: '3.1K', duration: '20:15' },
                    { id: 'yt-006', platform: 'youtube', title: 'Building Interactive 3D Scenes', description: 'Raycasting, hover effects, and click interactions in Three.js.', thumbnail: null, url: 'https://www.youtube.com/@itompoland', date: '2025-11-20', views: '2.8K', duration: '25:00' },
                    { id: 'yt-007', platform: 'youtube', title: 'WebGL Performance Deep Dive', description: 'Optimizing draw calls, geometry instancing, and more.', thumbnail: null, url: 'https://www.youtube.com/@itompoland', date: '2025-11-10', views: '1.5K', duration: '30:22' },
                    { id: 'yt-008', platform: 'youtube', title: 'Procedural Textures Tutorial', description: 'Creating textures with noise and math functions.', thumbnail: null, url: 'https://www.youtube.com/@itompoland', date: '2025-10-28', views: '1.9K', duration: '18:45' },

                    // ============ Blog Posts ============
                    { id: 'blog-001', platform: 'blog', title: 'Double Site of the Day confirmed! 🏆🏆', description: 'You\'ve probably noticed I\'ve been sharing a bunch of SOTD certificates on my stories lately. Yes, it\'s true—the YOUNG MULTI project officially scored a "double" and got recognized on the international stage...', frontTexture: '/textures/studio/monitorfront_postnafbdoublewinner.webp', paintedFrontTexture: '/textures/studio/monitorfront_postnafbdoublewinner_painted.webp', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58/posts/pfbid0TmvbFrc9ASYBQHpv3fcz5gM9WZrgrLMzZFbbtSFySmzQNickLRNh6ubu388D7hHXl?rdid=nWrKXJXR8EqibqvZ', date: '2026-01-08', readTime: '5 min' },
                    { id: 'blog-002', platform: 'blog', title: 'The Hand-Drawn Aesthetic', description: 'How I achieved a sketch-like visual style using shaders.', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58', date: '2025-12-20', readTime: '8 min' },
                    { id: 'blog-003', platform: 'blog', title: 'Optimizing 3D for the Web', description: 'Performance tips for smooth 60fps 3D experiences.', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58', date: '2025-12-10', readTime: '6 min' },
                    { id: 'blog-004', platform: 'blog', title: 'Creative Coding Journey', description: 'My path from traditional dev to creative development.', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58', date: '2025-11-25', readTime: '10 min' },
                    { id: 'blog-005', platform: 'blog', title: 'The Future of Web Experiences', description: 'Where I think interactive web is heading.', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58', date: '2025-11-15', readTime: '7 min' },
                    { id: 'blog-006', platform: 'blog', title: 'Design Systems for 3D', description: 'Creating consistent 3D component libraries.', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58', date: '2025-11-01', readTime: '12 min' },
                    { id: 'blog-007', platform: 'blog', title: 'Accessibility in 3D Web', description: 'Making immersive experiences accessible to everyone.', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58', date: '2025-10-20', readTime: '9 min' },
                    { id: 'blog-008', platform: 'blog', title: 'Audio in Web Experiences', description: 'Adding spatial audio to enhance immersion.', thumbnail: null, url: 'https://www.facebook.com/tomasz.szmajda.58', date: '2025-10-10', readTime: '6 min' },

                    // ============ TikToks ============
                    { id: 'tt-001', platform: 'tiktok', title: 'Zaobserwuj mnie na TikToku! ✨', description: 'Dzielę się tam wskazówkami z designu, kodowania i nie tylko.', frontTexture: '/textures/studio/phonefront_followmeontiktok.webp', paintedFrontTexture: '/textures/studio/phonefront_followmeontiktok_painted.webp', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2026-01-09', views: '15.2K', likes: '1.2K' },
                    { id: 'tt-002', platform: 'tiktok', title: 'Coding a door animation 🚪', description: 'POV: You open a door in Three.js', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2026-01-03', views: '8.5K', likes: '756' },
                    { id: 'tt-003', platform: 'tiktok', title: 'When the shader finally works 🎉', description: 'The satisfaction of debugging shaders', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-12-25', views: '22.1K', likes: '3.4K' },
                    { id: 'tt-004', platform: 'tiktok', title: 'Day in the life: WebGL Dev', description: 'What I do as a creative developer', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-12-18', views: '12.3K', likes: '1.1K' },
                    { id: 'tt-005', platform: 'tiktok', title: 'React vs Three.js POV 😅', description: 'The struggle is real', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-12-12', views: '45.2K', likes: '5.8K' },
                    { id: 'tt-006', platform: 'tiktok', title: 'Making a 3D button 🔘', description: '30 seconds of pure satisfaction', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-12-05', views: '18.7K', likes: '2.1K' },
                    { id: 'tt-007', platform: 'tiktok', title: 'This shader took 3 hours 💀', description: 'Was it worth it? Absolutely.', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-11-28', views: '33.4K', likes: '4.2K' },
                    { id: 'tt-008', platform: 'tiktok', title: 'Hover effects compilation ✨', description: 'My favorite micro-interactions', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-11-20', views: '28.9K', likes: '3.6K' },
                    { id: 'tt-009', platform: 'tiktok', title: 'Loading screen ideas 🔄', description: 'Creative preloader concepts', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-11-15', views: '19.3K', likes: '2.4K' },
                    { id: 'tt-010', platform: 'tiktok', title: 'Cursor goes brrr 🖱️', description: 'Custom cursor madness', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-11-08', views: '41.2K', likes: '5.1K' },
                    { id: 'tt-011', platform: 'tiktok', title: 'Parallax scrolling magic 🪄', description: 'Simple but effective', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-11-01', views: '25.6K', likes: '3.0K' },
                    { id: 'tt-012', platform: 'tiktok', title: 'Text animation inspo 📝', description: 'Typography that moves', thumbnail: null, url: 'https://www.tiktok.com/@itompoland', date: '2025-10-25', views: '31.8K', likes: '4.0K' },
                ],
            },
        },
        {
            id: 'about',
            type: 'about',
            label: 'THE ABOUT',
            shortLabel: 'About',
            path: '/about',
            side: 'left',
            relativeZ: -48,
            icon: '★',
            color: '#efe6f5',
            enterDistance: 25, // 深入房间（云层很远）
            sign: { style: 'single', fontSize: 0.30 },
            textures: {
                door: '/textures/corridor/doors/drzwiabout.webp',
                doorPainted: '/textures/corridor/doors/drzwiabout_painted.webp',
            },
            map: {
                x: 43, y: 38,
                paintedImage: '/images/map_about_painted.webp',
                clipPath: 'polygon(10% 20%, 40% 20%, 40% 55%, 10% 55%)',
                labelPos: { x: 26, y: 28 },
            },
            subtitle: 'My development journey',
            meta: {
                title: 'About Me — ITom Portfolio',
                description:
                    'Learn about Tomasz "ITom" Szmajda — a creative frontend developer specializing in 3D web experiences, React, Three.js, and GSAP animations.',
            },
            content: {
                // About 房间按 3D 场景的 4 个「阶段」分块编辑：
                //   intro    - 开场：姓名/品牌/头像/座右铭
                //   awards   - 奖项：3 组（SOTD / SOTM / OTHER）
                //   journey  - 经历：2 个浮空岛（U/O + FREELANCE）
                //   skills   - 技能：10 个气球
                // 改这里保存后自动刷新预览
                intro: {
                    name: 'TOMASZ SZMAJDA',
                    brand: '(ITOM)',
                    avatar: '/textures/about/awatarnachmurce.webp',
                    motto1: '"Crafting digital experiences',
                    motto2: 'that push creative boundaries"',
                },
                // About 奖项（原来在 InfiniteSkyManager.jsx 的 AWARDS_DATA，迁到配置统一管理）
                // 改这里保存后自动刷新预览
                awards: {
                    featured: {
                        id: 'award-featured',
                        layout: 'certificate_grid',
                        title: 'Featured Projects Collection',
                        items: [
                            { label: 'Featured - Awwwards', date: 'May 2025', image: '/textures/about/FEATURED.webp', url: 'https://awwwards.com' },
                            { label: 'Featured - CSS Design Awards', date: 'June 2025', image: '/textures/about/FEATURED.webp', url: 'https://cssdesignawards.com' },
                            { label: 'Featured - The FWA', date: 'July 2025', image: '/textures/about/FEATURED.webp', url: 'https://thefwa.com' },
                            { label: 'Featured - Behance', date: 'August 2025', image: '/textures/about/FEATURED.webp', url: 'https://behance.net' },
                        ],
                        platformConfig: { label: 'HONOR', color: '#1a1a1a', icon: '⭐' },
                    },
                    sotd: {
                        id: 'award-sotd',
                        layout: 'certificate_grid',
                        title: 'Site of the Day Awards',
                        items: [
                            { label: 'SOTD - GSAP', date: 'February 13, 2026', image: '/textures/about/SOTDAYYOUNGMULTIGSAP.webp', url: 'https://www.linkedin.com/posts/greensock_site-of-the-day-young-multi-this-immersive-activity-7427567524940017664-zU2n?utm_source=share&utm_medium=member_desktop&rcm=ACoAAE3TV6UBqXoaJXUN5-1s3ij6SQJwTRAcbCM' },
                            { label: 'SOTD - CSS Winner', date: 'January 24, 2026', image: '/textures/about/SOTDAYYOUNGMULTICSSWINNER.webp', url: 'https://www.csswinner.com/details/young-multi-official-experience/19045' },
                            { label: 'SOTD - Orpetron', date: 'January 29, 2026', image: '/textures/about/SOTDAYYOUNGMULTIORPETRON.webp', url: 'https://orpetron.com/sites/young-multi/' },
                            { label: 'SOTD - Design Nominess', date: 'February 17, 2026', image: '/textures/about/SOTDAYYOUNGMULTIDESIGNNOMINESS.webp', url: 'https://www.designnominees.com/sites/young-multi' },
                        ],
                        platformConfig: { label: 'AWARD', color: '#1a1a1a', icon: '🏆' },
                    },
                    sotm: {
                        id: 'award-sotm',
                        layout: 'certificate_grid',
                        title: 'Site of the Month Awards',
                        items: [],
                        platformConfig: { label: 'AWARD', color: '#1a1a1a', icon: '📅' },
                    },
                    other: {
                        id: 'award-other',
                        layout: 'certificate_grid',
                        title: 'Other Awards',
                        items: [],
                        platformConfig: { label: 'PRESTIGE', color: '#1a1a1a', icon: '👑' },
                    },
                },
                // Journey 阶段：浮空岛（U/O + FREELANCE）
                // 改 label / period 实时反映到 3D 场景中的文字与日期
                journey: {
                    title: 'JOURNEY',
                    subtitle: 'My path so far...',
                    islands: [
                        {
                            id: 'uo',
                            label: 'U/O',
                            period: '2025-NOW',
                            image: '/textures/about/uowyspa.webp',
                        },
                        {
                            id: 'freelance',
                            label: 'FREELANCE',
                            period: '2023-NOW',
                            image: '/textures/about/freelancewyspa.webp',
                        },
                    ],
                },
                // Skills 阶段：技能气球（点击爆炸显示技术名）
                // 改 label 实时反映到 3D 场景；增删气球实时刷新位置
                skills: {
                    title: 'SKILLS',
                    subtitle: 'Technologies I love working with',
                    items: [
                        // 大气球：主要技能（前景）
                        { label: 'React',     texture: '/textures/about/reactduzybalon.webp',        paintedTexture: '/textures/about/reactduzybalon_painted.webp',        size: 'large',  x: -2.5, y: 2,   z: 0.3, phase: 0 },
                        { label: 'Three.js',  texture: '/textures/about/threejsduzybalon.webp',     paintedTexture: '/textures/about/threejsduzybalon_painted.webp',     size: 'large',  x: 2.5,  y: 2.5, z: 0.2, phase: 1.5 },
                        { label: 'GSAP',      texture: '/textures/about/GSAPduzybalon.webp',        paintedTexture: '/textures/about/GSAPduzybalon_painted.webp',        size: 'large',  x: 0,    y: 3,   z: 0.5, phase: 3 },
                        // 中气球：辅助技能（散布）
                        { label: 'JavaScript', texture: '/textures/about/JSSREDNIBALON.webp',     paintedTexture: '/textures/about/JSSREDNIBALON_painted.webp',        size: 'medium', x: -4,   y: 1,   z: -0.3, phase: 0.8 },
                        { label: 'CSS',        texture: '/textures/about/csssrednibalon.webp',     paintedTexture: '/textures/about/csssrednibalon_painted.webp',        size: 'medium', x: 4,    y: 1.5, z: -0.2, phase: 2.2 },
                        { label: 'Next.js',    texture: '/textures/about/nextjssrednibalon.webp',  paintedTexture: '/textures/about/nextjssrednibalon_painted.webp',     size: 'medium', x: 0,    y: 0.5, z: -0.4, phase: 4 },
                        // 小气球：背景点缀
                        { label: 'HTML',     texture: '/textures/about/htmlmalybalon.webp',         paintedTexture: '/textures/about/htmlmalybalon_painted.webp',         size: 'small',  x: -5.5, y: 2.5, z: -0.8, phase: 1.2 },
                        { label: 'Git',      texture: '/textures/about/gitmalybalon.webp',          paintedTexture: '/textures/about/gitmalybalon_painted.webp',          size: 'small',  x: 5.5,  y: 3,   z: -0.7, phase: 2.8 },
                        { label: 'Figma',    texture: '/textures/about/figmamalybalon.webp',        paintedTexture: '/textures/about/figmamalybalon_painted.webp',        size: 'small',  x: -3,   y: 4.5, z: -0.5, phase: 3.5 },
                        { label: 'Firebase', texture: '/textures/about/firebasemalybalon.webp',     paintedTexture: '/textures/about/firebasemalybalon_painted.webp',     size: 'small',  x: 3.5,  y: 4,   z: -0.6, phase: 4.5 },
                    ],
                },
            },
        },
        {
            id: 'contact',
            type: 'contact',
            label: 'CONTACT',
            shortLabel: 'Contact',
            path: '/contact',
            side: 'right',
            relativeZ: -62,
            icon: '✉',
            color: '#f5e6e6',
            enterDistance: 8,
            sign: { style: 'single', fontSize: 0.25 },
            textures: {
                door: '/textures/corridor/doors/drzwikontakt.webp',
                doorPainted: '/textures/corridor/doors/drzwikontakt_painted.webp',
            },
            map: {
                x: 57, y: 25,
                paintedImage: '/images/map_contact_painted.webp',
                clipPath: 'polygon(60% 10%, 95% 10%, 95% 35%, 60% 35%)',
                labelPos: { x: 76, y: 14 },
            },
            subtitle: 'Get in touch with me',
            meta: {
                title: 'Contact — ITom Portfolio',
                description:
                    'Get in touch with Tomasz "ITom" Szmajda. Find social media links and contact information in this interactive 3D contact room.',
            },
            content: {
                email: 'tomszma12@gmail.com',
                socials: [
                    { id: 'linkedin', label: 'LINKEDIN', url: 'https://www.linkedin.com/in/tomasz-szmajda-259337305/' },
                    { id: 'github', label: 'GITHUB', url: 'https://github.com/ITomPoland' },
                    { id: 'facebook', label: 'FACEBOOK', url: 'https://www.facebook.com/people/ITom/61586563487664/' },
                    { id: 'instagram', label: 'INSTAGRAM', url: 'https://www.instagram.com/itom.dev/' },
                ],
            },
        },
    ],
};

// 直接导出配置（固定 4 个房间，地图/走廊位置均为手动指定）
export const siteConfig = baseSiteConfig;

export default siteConfig;

// =============================================================================
// 开发期热更新：配置是模块级常量并被很多组件 useMemo 缓存，
// 直接改文件时局部 HMR 不会重建这些缓存，导致"改了不生效"。
// 这里强制整页刷新，确保所有模块级常量与组件缓存重新计算。
// =============================================================================
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        import.meta.hot.invalidate('site.config changed — full reload');
    });
}
