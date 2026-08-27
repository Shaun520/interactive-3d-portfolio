import { useState, useEffect, useRef } from 'react';
import { useSiteConfig } from '../../context/SiteConfigContext';
import { siteConfig } from '../../site.config';
import '../../styles/ContentEditorPanel.scss';

/**
 * =============================================================================
 * ContentEditorPanel — 实时编辑面板（开发工具）
 * =============================================================================
 *
 * 两个标签页，均「输入即实时反映」到 3D 场景：
 *
 * 1. 房间内容（gallery / studio / about）
 *    编辑文本字段（标题 / 描述 / 链接 / 日期…），改 content 状态。
 *
 * 2. 走廊门（全部房间）
 *    编辑门牌文字(label)、短名(shortLabel)、左右侧(side)、前后位置(relativeZ)、
 *    门面贴图(textures.door / doorPainted)，改 rooms 字段 → 走廊上的门实时变化。
 *
 * 保存（不刷新页面）：
 *   - 内容 → POST { roomId, content }  写 public/site.content.dev.json 的 content 键
 *   - 门   → POST { roomId, fields }   写同文件的 rooms 键
 *   下次刷新/重新加载时 SiteConfigProvider 自动恢复。
 *
 * 开关：右下角 ✏️ 按钮，或键盘 E / Esc。
 * =============================================================================
 */

const ROOM_OPTIONS = [
    { id: 'gallery', label: 'Gallery · 项目卡片' },
    { id: 'studio', label: 'Studio · 内容流' },
    { id: 'about', label: 'About · 奖项' },
    { id: 'contact', label: 'Contact · 社交链接' },
];

const AWARD_GROUP_LABELS = {
    featured: 'Featured',
    sotd: 'Site of the Day',
    sotm: 'Site of the Month',
    other: 'Other',
};

// About 房间按 3D 场景的 4 个「阶段」分块编辑
const ABOUT_PHASES = [
    { id: 'intro',   label: '① 开场',   hint: '姓名/品牌/头像/座右铭' },
    { id: 'awards',  label: '② 奖项',   hint: 'SOTD / SOTM / OTHER 三组证书' },
    { id: 'journey', label: '③ 经历',   hint: '浮空岛 U/O + FREELANCE' },
    { id: 'skills',  label: '④ 技能',   hint: '可点击爆炸的气球列表' },
];

// 走廊门可编辑字段（保存时写入覆盖文件 rooms 键）
const pickDoorFields = (room) => ({
    label: room?.label,
    shortLabel: room?.shortLabel,
    side: room?.side,
    relativeZ: room?.relativeZ,
    textures: room?.textures ? { ...room.textures } : undefined,
});

// 深度更新 content 的指定路径（path 为键/下标数组）
const updateAt = (content, path, value) => {
    const clone = JSON.parse(JSON.stringify(content ?? {}));
    let cur = clone;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    cur[path[path.length - 1]] = value;
    return clone;
};

const TextField = ({ label, value, onChange, rows }) => (
    <label className="cep-field">
        <span className="cep-field-label">{label}</span>
        <textarea
            rows={rows || (label.includes('描述') ? 3 : 1)}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
        />
    </label>
);

const SelectField = ({ label, value, onChange, children }) => (
    <label className="cep-field">
        <span className="cep-field-label">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </label>
);

// 图片上传按钮：选择本地图片 → base64 POST /__upload-image → 存 public/textures/{dir}/ → onUpload(url)
// 自带预览：左侧 32×32 缩略图（当前已保存图 + 选中后本地预览），点击放大查看
// onClear：可选，传入时显示「清除」按钮，点击后把图片字段清空（用于「可留空」的图）
const UploadBtn = ({ label, currentUrl, onUpload, dir = 'gallery', onClear }) => {
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    // 本地预览（FileReader 读取后的 dataURL，未上传时显示）
    const [localPreview, setLocalPreview] = useState(null);
    // 全屏查看大图
    const [lightboxUrl, setLightboxUrl] = useState(null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        // 1) 立刻显示本地预览（不等上传完成）
        reader.onload = () => {
            const dataUrl = String(reader.result);
            setLocalPreview(dataUrl);
        };
        reader.readAsDataURL(file);

        // 2) 另起一个 reader 提取 base64 上传
        const uploadReader = new FileReader();
        uploadReader.onload = async () => {
            const data = String(uploadReader.result).split(',')[1] || '';
            const rawExt = (file.name.split('.').pop() || '').toLowerCase();
            const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : 'png';
            const filename = `${dir}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            setUploading(true);
            try {
                const res = await fetch('/__upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename, data, dir }),
                });
                const json = await res.json();
                if (json.ok && json.url) {
                    onUpload(json.url);
                    setLocalPreview(null); // 上传成功后切换到 currentUrl 显示
                } else {
                    alert('上传失败：' + json.error);
                }
            } catch (err) {
                alert('上传失败：' + err);
            } finally {
                setUploading(false);
            }
        };
        uploadReader.readAsDataURL(file);
    };

    // 优先显示本地预览（刚选中未上传完时），否则显示已保存的 currentUrl
    const previewSrc = localPreview || currentUrl;

    return (
        <div className="cep-upload">
            {previewSrc ? (
                <button
                    type="button"
                    className={`cep-upload-thumb ${localPreview ? 'is-local' : ''}`}
                    onClick={() => setLightboxUrl(previewSrc)}
                    title="点击查看大图"
                    aria-label="查看大图"
                >
                    <img src={previewSrc} alt="" />
                    {localPreview && <span className="cep-upload-badge">预览</span>}
                </button>
            ) : (
                <span className="cep-upload-placeholder" aria-hidden="true">无图</span>
            )}
            <span className="cep-upload-url" title={currentUrl || ''}>
                {currentUrl ? (currentUrl.split('/').pop() || currentUrl) : '（未设置）'}
            </span>
            <button
                type="button"
                className="cep-btn"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
            >
                {uploading ? '上传中…' : label}
            </button>
            {onClear && currentUrl && (
                <button
                    type="button"
                    className="cep-btn cep-btn-danger"
                    title="清除图片，恢复无图状态"
                    onClick={() => {
                        setLocalPreview(null);
                        setLightboxUrl(null);
                        onClear();
                    }}
                >
                    清除
                </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

            {lightboxUrl && (
                <div className="cep-lightbox" onClick={() => setLightboxUrl(null)} role="dialog" aria-label="图片预览">
                    <img src={lightboxUrl} alt="" onClick={(e) => e.stopPropagation()} />
                    <button type="button" className="cep-lightbox-close" onClick={() => setLightboxUrl(null)} aria-label="关闭">×</button>
                </div>
            )}
        </div>
    );
};

// 音频上传 + 试听：选择本地音频 → base64 POST /__upload-image (dir=sounds) → onUpload(url)
// 自带播放/停止试听 + 清除按钮
const AudioField = ({ label, currentUrl, onUpload, onClear, dir = 'sounds' }) => {
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef(null);

    // 组件卸载时停止试听
    useEffect(() => () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    }, []);

    const stopPlay = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setPlaying(false);
    };

    const togglePlay = () => {
        if (playing) {
            stopPlay();
            return;
        }
        if (!currentUrl) return;
        stopPlay();
        const audio = new Audio(currentUrl);
        audioRef.current = audio;
        audio.addEventListener('ended', () => setPlaying(false));
        audio.play().catch((e) => alert('播放失败：' + e));
        setPlaying(true);
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        stopPlay();

        const reader = new FileReader();
        reader.onload = async () => {
            const data = String(reader.result).split(',')[1] || '';
            const rawExt = (file.name.split('.').pop() || '').toLowerCase();
            const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : 'mp3';
            const filename = `music-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            setUploading(true);
            try {
                const res = await fetch('/__upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename, data, dir }),
                });
                const json = await res.json();
                if (json.ok && json.url) {
                    onUpload(json.url);
                } else {
                    alert('上传失败：' + json.error);
                }
            } catch (err) {
                alert('上传失败：' + err);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="cep-upload">
            <span className="cep-upload-url" title={currentUrl || ''}>
                {currentUrl ? (currentUrl.split('/').pop() || currentUrl) : '（未设置）'}
            </span>
            {currentUrl && (
                <button
                    type="button"
                    className="cep-btn"
                    onClick={togglePlay}
                    disabled={uploading}
                >
                    {playing ? '⏸ 停止' : '▶ 试听'}
                </button>
            )}
            <button
                type="button"
                className="cep-btn"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
            >
                {uploading ? '上传中…' : label}
            </button>
            {onClear && currentUrl && (
                <button
                    type="button"
                    className="cep-btn cep-btn-danger"
                    title="清除音乐，恢复默认"
                    onClick={() => { stopPlay(); onClear(); }}
                >
                    清除
                </button>
            )}
            <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
    );
};

// 走廊场景贴图分组上传（corridorTextures）
const CORRIDOR_TEXTURE_GROUPS = [
    {
        title: '基础场景',
        items: [
            { key: 'floor', label: '地板' },
            { key: 'ceiling', label: '天花板' },
            { key: 'wall', label: '墙面' },
            { key: 'baseboard', label: '踢脚线' },
        ],
    },
    {
        title: '壁画相框',
        items: [
            { key: 'frame', label: '大相框（草图）' },
            { key: 'framePainted', label: '大相框（上色）' },
            { key: 'standingFrame', label: '立式小相框' },
        ],
    },
    {
        title: '装饰 / 吊灯 / 家具',
        items: [
            { key: 'tree', label: '盆栽树' },
            { key: 'grate', label: '通风口' },
            { key: 'flower', label: '盆栽花' },
            { key: 'lampGrille', label: '吊灯格栅' },
            { key: 'lampSide', label: '吊灯侧板' },
            { key: 'wood', label: '桌腿木纹' },
            { key: 'tableTop', label: '桌面' },
            { key: 'cabinetFront', label: '柜子正面' },
            { key: 'cabinetRest', label: '柜子顶部' },
        ],
    },
    {
        title: '房间门通用件',
        items: [
            { key: 'doorFrame', label: '门框' },
            { key: 'doorHandle', label: '把手（草图）' },
            { key: 'doorHandlePainted', label: '把手（上色）' },
            { key: 'doorBack', label: '门背' },
            { key: 'arrow', label: '箭头' },
            { key: 'emptySign', label: '空白门牌' },
        ],
    },
    {
        title: '段末大门（双扇）',
        items: [
            { key: 'segFrame', label: '大门门框' },
            { key: 'segDoorLeft', label: '左门扇' },
            { key: 'segDoorRight', label: '右门扇' },
            { key: 'segHandleLeft', label: '左把手' },
            { key: 'segHandleRight', label: '右把手' },
            { key: 'segDoorBack', label: '大门门背' },
            { key: 'segEdge', label: '门侧边' },
        ],
    },
    {
        title: '段末门旁墙面装饰',
        items: [
            { key: 'decorWhileTrue', label: 'While True 挂画' },
            { key: 'decorCoffee', label: 'Coffee 挂画' },
            { key: 'decorIdea', label: 'Idea 挂画' },
        ],
    },
];

const CorridorTextureFields = ({ textures = {}, onUpdate }) => (
    <>
        {CORRIDOR_TEXTURE_GROUPS.map((group) => (
            <div key={group.title}>
                <div className="cep-item-title cep-subgroup">{group.title}</div>
                {group.items.map(({ key, label }) => (
                    <div className="cep-item" key={key}>
                        <div className="cep-item-title">{label}</div>
                        <UploadBtn
                            label="换贴图"
                            currentUrl={textures[key]}
                            dir="corridor"
                            onUpload={(url) => onUpdate(key, url)}
                        />
                    </div>
                ))}
            </div>
        ))}
    </>
);

const ContentEditorPanel = () => {
    const { rooms, updateRoom, updateRoomContent, homeContent, updateHomeContent, outdoorContent, updateOutdoorContent, corridorTextures, updateCorridorTexture, setStudioFocusId } = useSiteConfig();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('outdoor'); // 'content' | 'corridor' | 'home' | 'outdoor'
    const [roomId, setRoomId] = useState('gallery');
    const [studioIdx, setStudioIdx] = useState(0);
    const [awardGroup, setAwardGroup] = useState('sotd');
    const [awardIdx, setAwardIdx] = useState(0);
    const [aboutPhase, setAboutPhase] = useState('intro'); // 'intro' | 'awards' | 'journey' | 'skills'
    const [journeyIdx, setJourneyIdx] = useState(0);
    const [skillIdx, setSkillIdx] = useState(0);
    const [corridorRoomId, setCorridorRoomId] = useState('gallery');
    const [saveMsg, setSaveMsg] = useState('');

    const room = rooms.find((r) => r.id === roomId);
    const content = room?.content;
    const doorRoom = rooms.find((r) => r.id === corridorRoomId);

    // 「恢复默认」基准：初始为配置原值；保存成功后更新为刚保存的内容，
    // 使「恢复默认」回到磁盘上当前保存的值（保存不刷新页面，需自行跟踪）
    const savedBaseRef = useRef({});
    const savedFieldsRef = useRef({});
    const savedHomeRef = useRef(undefined);
    const savedOutdoorRef = useRef(undefined);
    const getBase = (rid) => (
        savedBaseRef.current[rid] !== undefined
            ? savedBaseRef.current[rid]
            : (siteConfig.rooms.find((r) => r.id === rid)?.content)
    );
    const getFieldsBase = (rid) => (
        savedFieldsRef.current[rid] !== undefined
            ? savedFieldsRef.current[rid]
            : pickDoorFields(siteConfig.rooms.find((r) => r.id === rid))
    );

    // 快捷键：E 开关，Esc 关闭
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
            else if (e.key === 'e' || e.key === 'E') setOpen((o) => !o);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    const setContentPath = (path, value) => {
        updateRoomContent(roomId, (c) => updateAt(c, path, value));
    };

    // Gallery 项目新增（最多 8 个）/ 删除（至少 1 个）
    const addProject = () => {
        updateRoomContent('gallery', (c) => {
            const projects = [...(c?.projects || [])];
            if (projects.length >= 8) return c;
            projects.push({
                id: `project-${Date.now()}`,
                title: 'NEW PROJECT',
                front: '/textures/gallery/monetuneprzod.webp',
                painted: '/textures/gallery/monetuneprzod_painted.webp',
                url: '',
                description: '',
                techStack: ['/textures/gallery/htmllogo.webp', '/textures/gallery/csslogo.webp', '/textures/gallery/jslogo.webp'],
            });
            return { ...c, projects };
        });
    };
    const removeProject = (index) => {
        updateRoomContent('gallery', (c) => {
            const projects = [...(c?.projects || [])];
            if (projects.length <= 1) return c;
            projects.splice(index, 1);
            return { ...c, projects };
        });
    };

    // Gallery 项目 techStack（技术栈 logo 图片路径数组）操作
    const setTechStack = (pi, ti, url) => {
        updateRoomContent('gallery', (c) => {
            const projects = [...(c?.projects || [])];
            const ts = [...(projects[pi]?.techStack || [])];
            ts[ti] = url;
            projects[pi] = { ...projects[pi], techStack: ts };
            return { ...c, projects };
        });
    };
    const addTechStack = (pi, url) => {
        updateRoomContent('gallery', (c) => {
            const projects = [...(c?.projects || [])];
            projects[pi] = { ...projects[pi], techStack: [...(projects[pi]?.techStack || []), url] };
            return { ...c, projects };
        });
    };
    const removeTechStack = (pi, ti) => {
        updateRoomContent('gallery', (c) => {
            const projects = [...(c?.projects || [])];
            const ts = [...(projects[pi]?.techStack || [])];
            ts.splice(ti, 1);
            projects[pi] = { ...projects[pi], techStack: ts };
            return { ...c, projects };
        });
    };

    // Studio 内容条目新增 / 删除（至少保留 1 条）
    const addStudioItem = () => {
        const newId = `item-${Date.now()}`;
        const nextIdx = (content?.items?.length || 0);
        updateRoomContent('studio', (c) => {
            const items = [...(c?.items || [])];
            items.push({
                id: newId,
                platform: 'youtube',
                title: 'NEW CONTENT',
                description: '',
                url: '',
                date: new Date().toISOString().slice(0, 10),
                views: '0',
                thumbnail: null,
                showLink: true,
            });
            return { ...c, items };
        });
        setStudioIdx(nextIdx);
        setStudioFocusId(newId);
    };
    const removeStudioItem = (index) => {
        updateRoomContent('studio', (c) => {
            const items = [...(c?.items || [])];
            if (items.length <= 1) return c;
            items.splice(index, 1);
            return { ...c, items };
        });
        // 删除后调整选中索引（用当前长度估算，至少 0）
        setStudioIdx((cur) => {
            const newLen = (content?.items?.length || 1) - 1;
            return Math.max(0, Math.min(cur, newLen - 1));
        });
    };

    // Contact · 社交链接删除（至少 1 个）
    const removeSocial = (index) => {
        const socials = [...(content?.socials || [])];
        if (socials.length <= 1) return;
        socials.splice(index, 1);
        updateRoomContent('contact', (c) => ({ ...c, socials }));
    };
    const setSocialField = (index, key, value) => {
        const socials = [...(content?.socials || [])];
        if (!socials[index]) return;
        socials[index] = { ...socials[index], [key]: value };
        updateRoomContent('contact', (c) => ({ ...c, socials }));
    };

    // 首页 · 头像帧新增 / 删除（至少 1 张）与字段更新
    const addAvatarFrame = () => {
        const frames = [...(homeContent?.avatarFrames || [])];
        if (frames.length >= 12) return;
        frames.push('/textures/corridor/avatar_anim/1.webp');
        updateHomeContent((c) => ({ ...c, avatarFrames: frames }));
    };
    const removeAvatarFrame = (index) => {
        const frames = [...(homeContent?.avatarFrames || [])];
        if (frames.length <= 1) return;
        frames.splice(index, 1);
        updateHomeContent((c) => ({ ...c, avatarFrames: frames }));
    };
    const setAvatarFrame = (index, value) => {
        const frames = [...(homeContent?.avatarFrames || [])];
        if (frames[index] === undefined) return;
        frames[index] = value;
        updateHomeContent((c) => ({ ...c, avatarFrames: frames }));
    };
    const setHomeField = (key, value) => {
        updateHomeContent((c) => ({ ...c, [key]: value }));
    };

    // 走廊壁画 · 单帧字段更新（image / signature）
    const setHomeFrame = (index, key, value) => {
        updateHomeContent((c) => {
            const frames = [...(c?.frames || [])];
            if (!frames[index]) return c;
            frames[index] = { ...frames[index], [key]: value };
            return { ...c, frames };
        });
    };

    // 走廊壁画 · 新增（最多 4 张） / 删除整张（至少 1 张）
    const addHomeFrame = () => {
        updateHomeContent((c) => {
            const frames = [...(c?.frames || [])];
            if (frames.length >= 4) return c;
            const maxRelZ = frames.reduce((m, f) => Math.max(m, f.relZ || 0), 0);
            frames.push({
                id: `frame-${Date.now()}`,
                relZ: maxRelZ + 15,
                side: frames.length % 2 === 0 ? 'right' : 'left',
                width: 2.5,
                height: 2.5 / 1.785,
                y: 0.3,
                offsetFromWall: 0,
                image: '',
                imageWidth: 1.1,
                imageHeight: 1.1,
                signature: 'Empty canvas!\nWant your art here?\nContact me!',
            });
            return { ...c, frames };
        });
    };
    const removeHomeFrame = (index) => {
        updateHomeContent((c) => {
            const frames = [...(c?.frames || [])];
            if (frames.length <= 1 || !frames[index]) return c;
            frames.splice(index, 1);
            return { ...c, frames };
        });
    };

    // 屋外 · 字段更新 / 贴图上传
    const setOutdoorField = (key, value) => {
        updateOutdoorContent((c) => ({ ...c, [key]: value }));
    };
    const setOutdoorTexture = (key, url) => {
        updateOutdoorContent((c) => ({ ...c, textures: { ...(c?.textures || {}), [key]: url } }));
    };

    // About · Journey 岛屿编辑（固定 2 个岛：U/O + FREELANCE，不允许新增/删除）
    const removeJourneyIsland = (index) => {
        const currentCount = content?.journey?.islands?.length || 0;
        updateRoomContent('about', (c) => {
            const islands = [...(c?.journey?.islands || [])];
            if (islands.length <= 1) return c;
            islands.splice(index, 1);
            return { ...c, journey: { ...c.journey, islands } };
        });
        setJourneyIdx((cur) => Math.max(0, Math.min(cur, currentCount - 2)));
    };

    // About · Skills 气球新增 / 删除（至少 1 个）
    const addSkillItem = () => {
        const newId = `skill-${Date.now()}`;
        const currentCount = content?.skills?.items?.length || 0;
        updateRoomContent('about', (c) => {
            const skills = c?.skills || { title: 'SKILLS', subtitle: '', items: [] };
            const items = [...(skills.items || [])];
            items.push({
                label: 'NewSkill',
                texture: '/textures/about/htmlmalybalon.webp',
                paintedTexture: '/textures/about/htmlmalybalon_painted.webp',
                size: 'small',
                x: 0, y: 2, z: 0, phase: Math.random() * 5,
            });
            return { ...c, skills: { ...skills, items } };
        });
        setSkillIdx(currentCount);
    };
    const removeSkillItem = (index) => {
        const currentCount = content?.skills?.items?.length || 0;
        updateRoomContent('about', (c) => {
            const items = [...(c?.skills?.items || [])];
            if (items.length <= 1) return c;
            items.splice(index, 1);
            return { ...c, skills: { ...c.skills, items } };
        });
        setSkillIdx((cur) => Math.max(0, Math.min(cur, currentCount - 2)));
    };

    // 走廊门字段实时更新
    const setDoorField = (key, value) => {
        updateRoom(corridorRoomId, (r) => ({ ...r, [key]: value }));
    };
    const setDoorTexture = (key, value) => {
        updateRoom(corridorRoomId, (r) => ({ ...r, textures: { ...(r.textures || {}), [key]: value } }));
    };

    const handleSave = async () => {
        setSaveMsg('保存中…');
        try {
            const isCorridor = activeTab === 'corridor';
            const isHome = activeTab === 'home';
            const isOutdoor = activeTab === 'outdoor';
            // 走廊 tab 同时保存「走廊门」字段 + 「走廊场景贴图」覆盖
            const body = isCorridor
                ? {
                    roomId: corridorRoomId,
                    fields: pickDoorFields(doorRoom),
                    corridorTextures,
                }
                : isHome
                    ? { roomId: 'home', content: homeContent }
                    : isOutdoor
                        ? { roomId: 'outdoor', content: outdoorContent }
                        : { roomId, content };
            const res = await fetch('/__save-room-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                // 保存写入 dev 覆盖文件，不刷新页面（内容已在内存实时生效）
                if (isCorridor) {
                    savedFieldsRef.current[corridorRoomId] = body.fields;
                } else if (isHome) {
                    savedHomeRef.current = homeContent;
                } else if (isOutdoor) {
                    savedOutdoorRef.current = outdoorContent;
                } else {
                    savedBaseRef.current[roomId] = content;
                }
                setSaveMsg('已保存修改 ✓');
            } else {
                setSaveMsg(`保存失败：${data.error}`);
            }
        } catch (e) {
            setSaveMsg(`保存失败：${e}`);
        }
    };

    const handleReset = () => {
        if (activeTab === 'corridor') {
            const base = getFieldsBase(corridorRoomId);
            if (base) updateRoom(corridorRoomId, base);
        } else if (activeTab === 'home') {
            const base = savedHomeRef.current !== undefined
                ? savedHomeRef.current
                : (siteConfig.home?.content);
            if (base) updateHomeContent(base);
        } else if (activeTab === 'outdoor') {
            const base = savedOutdoorRef.current !== undefined
                ? savedOutdoorRef.current
                : (siteConfig.outdoor?.content);
            if (base) updateOutdoorContent(base);
        } else {
            const base = getBase(roomId);
            if (base) updateRoomContent(roomId, base);
        }
    };

    // ============ 首页编辑器（走廊欢迎区：标题 / 副标题 / 头像） ============
    const renderHomeEditor = () => {
        const frames = homeContent?.avatarFrames || [];
        const hint = frames.length > 1
            ? `多帧（${frames.length} 张）→ ping-pong 挥手动画；只留 1 张 → 静态头像`
            : '单帧 → 静态头像；可再新增帧恢复挥手动画';
        return (
            <div className="cep-room">
                <div className="cep-item">
                    <TextField label="主标题（逐字母分裂动画）" value={homeContent?.title || ''} onChange={(v) => setHomeField('title', v)} />
                    <TextField label="副标题" value={homeContent?.tagline || ''} onChange={(v) => setHomeField('tagline', v)} />
                </div>
                <div className="cep-section-title">头像动画帧</div>
                <p className="cep-phase-hint">{hint}</p>
                {frames.map((f, i) => (
                    <div className="cep-item cep-avatar-frame" key={`frame-${i}`}>
                        <span className="cep-frame-idx">#{i + 1}</span>
                        <UploadBtn
                            label="换帧图"
                            currentUrl={f}
                            dir="corridor"
                            onUpload={(url) => setAvatarFrame(i, url)}
                        />
                        {frames.length > 1 && (
                            <button
                                type="button"
                                className="cep-item-del"
                                onClick={() => removeAvatarFrame(i)}
                                title="删除该帧"
                                aria-label="删除帧"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                <div className="cep-item-actions">
                    <button type="button" className="cep-btn" onClick={addAvatarFrame}>+ 新增帧</button>
                    <span className="cep-count">{frames.length} 张</span>
                </div>

                <div className="cep-section-title">走廊壁画（墙上画框）</div>
                <p className="cep-phase-hint">每张可换图 / 写签名 / 删除整张；图或签名为空则隐藏对应元素</p>
                {(homeContent?.frames || []).map((fr, i) => (
                    <div className="cep-item" key={fr.id || `frame-${i}`}>
                        <div className="cep-item-title">
                            <span>{fr.side === 'left' ? '← 左侧壁画' : '右侧壁画 →'} #{i + 1}</span>
                            <button
                                type="button"
                                className="cep-item-del"
                                onClick={() => removeHomeFrame(i)}
                                title="删除整张壁画"
                                aria-label="删除壁画"
                            >
                                ×
                            </button>
                        </div>
                        <UploadBtn
                            label="壁画图（可留空）"
                            currentUrl={fr.image || ''}
                            dir="corridor"
                            onUpload={(url) => setHomeFrame(i, 'image', url)}
                            onClear={() => setHomeFrame(i, 'image', '')}
                        />
                        <TextField
                            label="签名文字（可留空）"
                            value={fr.signature || ''}
                            onChange={(v) => setHomeFrame(i, 'signature', v)}
                        />
                    </div>
                ))}
                <div className="cep-item-actions">
                    <button
                        type="button"
                        className="cep-btn"
                        onClick={addHomeFrame}
                        disabled={(homeContent?.frames || []).length >= 4}
                    >
                        + 新增壁画
                    </button>
                    <span className="cep-count">{(homeContent?.frames || []).length} / 4 张</span>
                </div>
            </div>
        );
    };

    // ============ 屋外编辑器（PORTFOLIO 入口：木牌字 / 提示条 / 场景贴图） ============
    const renderOutdoorEditor = () => {
        const textures = outdoorContent?.textures || {};
        // dir：上传到哪个静态资源目录（vite 中间件白名单）
        // 门/门框/把手贴图在 /public/textures/doors/，其他屋外元素在 /public/textures/entrance/
        // inkSplash 默认在 /images/，但上传走 entrance 目录（预览仍显示原始路径）
        const TEXTURE_FIELDS = [
            { key: 'sign', label: '木牌贴图（背景）', dir: 'entrance' },
            // 门（草图 + 激活态上色）
            { key: 'doorLeft', label: '左门贴图', dir: 'doors' },
            { key: 'doorRight', label: '右门贴图', dir: 'doors' },
            { key: 'doorLeftPainted', label: '左门·激活态(上色)', dir: 'doors' },
            { key: 'doorRightPainted', label: '右门·激活态(上色)', dir: 'doors' },
            { key: 'frame', label: '门框贴图', dir: 'doors' },
            { key: 'handleLeft', label: '左把手·草图', dir: 'doors' },
            { key: 'handleRight', label: '右把手·草图', dir: 'doors' },
            { key: 'handleLeftPainted', label: '左把手·激活态', dir: 'doors' },
            { key: 'handleRightPainted', label: '右把手·激活态', dir: 'doors' },
            // 窗户与小人物
            { key: 'window', label: '窗户贴图', dir: 'entrance' },
            { key: 'avatarWindow', label: '窗内小人物', dir: 'entrance' },
            // 场景装饰角色
            { key: 'catFrontBody', label: '小猫', dir: 'entrance' },
            { key: 'mouseHanging', label: '悬挂鼠标', dir: 'entrance' },
            { key: 'bug', label: '爬虫', dir: 'entrance' },
            { key: 'inkSplash', label: '点击爬虫·墨水效果', dir: 'entrance' },
            { key: 'brickWall', label: '砖墙贴图', dir: 'entrance' },
            { key: 'stonePath', label: '石板路贴图', dir: 'entrance' },
            { key: 'tree', label: '树木贴图', dir: 'entrance' },
            { key: 'potDuck', label: '盆栽小鸭贴图', dir: 'entrance' },
        ];
        return (
            <div className="cep-room">
                <div className="cep-item">
                    <TextField
                        label="提示条标题（EXPLORER）"
                        value={outdoorContent?.tutorialTitle || ''}
                        onChange={(v) => setOutdoorField('tutorialTitle', v)}
                    />
                    <TextField
                        label="提示条正文（Click a door...）"
                        value={outdoorContent?.tutorialLabel || ''}
                        onChange={(v) => setOutdoorField('tutorialLabel', v)}
                    />
                    <TextField
                        label="点击爬虫提示文字"
                        value={outdoorContent?.bugText || ''}
                        onChange={(v) => setOutdoorField('bugText', v)}
                    />
                </div>
                <div className="cep-section-title">背景音乐</div>
                <p className="cep-phase-hint">点击门进入时播放；支持 mp3 / ogg / wav，上传后保存生效</p>
                <div className="cep-item">
                    <div className="cep-item-title">入口背景音乐</div>
                    <AudioField
                        label="上传音频"
                        currentUrl={outdoorContent?.music || ''}
                        onUpload={(url) => setOutdoorField('music', url)}
                        onClear={() => setOutdoorField('music', '')}
                    />
                </div>

                <div className="cep-section-title">入口场景贴图</div>
                <p className="cep-phase-hint">可替换门/把手/窗/小人物/小猫/鼠标/爬虫/墨水/墙/地/树/盆栽；点击缩略图可放大预览</p>
                {TEXTURE_FIELDS.map(({ key, label, dir }) => (
                    <div className="cep-item" key={key}>
                        <div className="cep-item-title">{label}</div>
                        <UploadBtn
                            label="换贴图"
                            currentUrl={textures[key]}
                            dir={dir}
                            onUpload={(url) => setOutdoorTexture(key, url)}
                        />
                    </div>
                ))}
            </div>
        );
    };

    // ============ 房间内容编辑器 ============
    const renderContentEditor = () => {
        if (roomId === 'gallery') {
            const projects = content?.projects || [];
            const canAdd = projects.length < 8;
            const canRemove = projects.length > 1;
            return (
                <div className="cep-room">
                    {projects.map((p, i) => (
                        <div className="cep-item" key={p.id || i}>
                            <div className="cep-item-title">
                                {p.title || `项目 ${i + 1}`}
                                {canRemove && (
                                    <button
                                        type="button"
                                        className="cep-item-del"
                                        onClick={() => removeProject(i)}
                                        title="删除该项目"
                                        aria-label="删除项目"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <TextField label="标题" value={p.title} onChange={(v) => setContentPath(['projects', i, 'title'], v)} />
                            <TextField label="描述" value={p.description} onChange={(v) => setContentPath(['projects', i, 'description'], v)} />
                            <TextField label="链接 URL" value={p.url} onChange={(v) => setContentPath(['projects', i, 'url'], v)} />
                            <UploadBtn label="上传封面" currentUrl={p.front} onUpload={(url) => setContentPath(['projects', i, 'front'], url)} />
                            <UploadBtn label="上传上色图" currentUrl={p.painted} onUpload={(url) => setContentPath(['projects', i, 'painted'], url)} />

                            {/* 技术栈 logo：图片路径数组，可添加/替换/删除 */}
                            <div className="cep-techstack">
                                <div className="cep-field-label">技术栈 logo（上传或替换）</div>
                                {(p.techStack || []).map((logo, ti) => (
                                    <div className="cep-techstack-row" key={ti}>
                                        <UploadBtn label="替换" currentUrl={logo} onUpload={(url) => setTechStack(i, ti, url)} />
                                        <button
                                            type="button"
                                            className="cep-item-del"
                                            onClick={() => removeTechStack(i, ti)}
                                            title="删除该技术栈"
                                            aria-label="删除技术栈"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <UploadBtn label="+ 添加技术栈" currentUrl="" onUpload={(url) => addTechStack(i, url)} />
                            </div>
                        </div>
                    ))}
                    <div className="cep-item-actions">
                        {canAdd && (
                            <button type="button" className="cep-btn" onClick={addProject}>+ 新增项目</button>
                        )}
                        <span className="cep-count">{projects.length} / 8</span>
                    </div>
                </div>
            );
        }

        if (roomId === 'studio') {
            const items = content?.items || [];
            const item = items[studioIdx] || {};
            const canRemoveItem = items.length > 1;
            return (
                <div className="cep-room">
                    <SelectField label={`选择条目（共 ${items.length} 条）`} value={String(studioIdx)} onChange={(v) => {
                        const idx = Number(v);
                        setStudioIdx(idx);
                        // 通知 StudioRoom 定位到该条目对应的监视器
                        setStudioFocusId(items[idx]?.id || null);
                    }}>
                        {items.map((it, i) => (
                            <option key={it.id || i} value={i}>{it.title || `${it.platform || ''} ${i + 1}`}</option>
                        ))}
                    </SelectField>
                    <div className="cep-item">
                        <div className="cep-item-title">
                            {item.title || `条目 ${studioIdx + 1}`}
                            {canRemoveItem && (
                                <button
                                    type="button"
                                    className="cep-item-del"
                                    onClick={() => removeStudioItem(studioIdx)}
                                    title="删除当前条目"
                                    aria-label="删除当前条目"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <SelectField label="平台 (platform)" value={item.platform || 'youtube'} onChange={(v) => setContentPath(['items', studioIdx, 'platform'], v)}>
                            <option value="youtube">YouTube</option>
                            <option value="blog">Blog</option>
                            <option value="tiktok">TikTok</option>
                        </SelectField>
                        <TextField label="标题" value={item.title} onChange={(v) => setContentPath(['items', studioIdx, 'title'], v)} />
                        <TextField label="描述" value={item.description} onChange={(v) => setContentPath(['items', studioIdx, 'description'], v)} />
                        <TextField label="日期 (date)" value={item.date} onChange={(v) => setContentPath(['items', studioIdx, 'date'], v)} />
                        <TextField label="浏览量 (views)" value={item.views} onChange={(v) => setContentPath(['items', studioIdx, 'views'], v)} />
                        <TextField label="链接 URL" value={item.url} onChange={(v) => setContentPath(['items', studioIdx, 'url'], v)} />
                        <SelectField label="Open Link 按钮" value={item.showLink === false ? 'off' : 'on'} onChange={(v) => setContentPath(['items', studioIdx, 'showLink'], v === 'on')}>
                            <option value="on">显示</option>
                            <option value="off">隐藏</option>
                        </SelectField>
                        <UploadBtn dir="studio" label="上传封面" currentUrl={item.frontTexture} onUpload={(url) => setContentPath(['items', studioIdx, 'frontTexture'], url)} />
                        <UploadBtn dir="studio" label="上传上色封面" currentUrl={item.paintedFrontTexture} onUpload={(url) => setContentPath(['items', studioIdx, 'paintedFrontTexture'], url)} />
                    </div>
                    <div className="cep-item-actions">
                        <button type="button" className="cep-btn" onClick={addStudioItem}>+ 新增条目</button>
                        <span className="cep-count">{items.length} 条</span>
                    </div>
                </div>
            );
        }

        if (roomId === 'about') {
            // 4 阶段切换器：和 3D 场景的 INTRO → AWARDS → JOURNEY → SKILLS 一一对应
            const currentPhase = ABOUT_PHASES.find((p) => p.id === aboutPhase);
            return (
                <div className="cep-room">
                    {/* 阶段选择器（药丸式分段控件） */}
                    <div className="cep-phase-switch" role="tablist" aria-label="About 编辑阶段">
                        {ABOUT_PHASES.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                role="tab"
                                aria-selected={aboutPhase === p.id}
                                className={`cep-phase-pill ${aboutPhase === p.id ? 'active' : ''}`}
                                onClick={() => setAboutPhase(p.id)}
                                title={p.hint}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {currentPhase && (
                        <div className="cep-phase-hint">
                            {currentPhase.hint}
                        </div>
                    )}

                    {/* === 阶段 1：开场（intro）==  */}
                    {aboutPhase === 'intro' && (() => {
                        const intro = content?.intro || {};
                        return (
                            <div className="cep-item">
                                <div className="cep-item-title">① 开场（云上人物）</div>
                                <TextField
                                    label="姓名（主标题，3D 中最大号字）"
                                    value={intro.name}
                                    onChange={(v) => setContentPath(['intro', 'name'], v)}
                                />
                                <TextField
                                    label="品牌名（副标题，灰字）"
                                    value={intro.brand}
                                    onChange={(v) => setContentPath(['intro', 'brand'], v)}
                                />
                                <TextField
                                    label="座右铭 第 1 行（引号可写在这里）"
                                    value={intro.motto1}
                                    onChange={(v) => setContentPath(['intro', 'motto1'], v)}
                                />
                                <TextField
                                    label="座右铭 第 2 行"
                                    value={intro.motto2}
                                    onChange={(v) => setContentPath(['intro', 'motto2'], v)}
                                />
                                <UploadBtn
                                    dir="about"
                                    label="上传头像（云上人物）"
                                    currentUrl={intro.avatar}
                                    onUpload={(url) => setContentPath(['intro', 'avatar'], url)}
                                />
                            </div>
                        );
                    })()}

                    {/* === 阶段 2：奖项（awards）==  */}
                    {aboutPhase === 'awards' && (() => {
                        // 只暴露 3D 场景实际渲染的 3 组：sotd / sotm / other
                        const groupsInScene = ['sotd', 'sotm', 'other'];
                        const awards = content?.awards || {};
                        const group = awards[awardGroup] || {};
                        const items = group.items || [];
                        const item = items[awardIdx] || {};
                        const canRemove = items.length > 0;
                        return (
                            <>
                                <SelectField
                                    label="奖项组（3D 场景里从左到右的三张证书）"
                                    value={awardGroup}
                                    onChange={(v) => { setAwardGroup(v); setAwardIdx(0); }}
                                >
                                    {groupsInScene.map((g) => (
                                        <option key={g} value={g}>{AWARD_GROUP_LABELS[g] || g}</option>
                                    ))}
                                </SelectField>
                                <SelectField
                                    label={`该组下的证书（共 ${items.length} 条）`}
                                    value={String(awardIdx)}
                                    onChange={(v) => setAwardIdx(Number(v))}
                                >
                                    {items.map((it, i) => (
                                        <option key={i} value={i}>{it.label || `证书 ${i + 1}`}</option>
                                    ))}
                                </SelectField>
                                <div className="cep-item">
                                    <div className="cep-item-title">
                                        {item.label || `证书 ${awardIdx + 1}`}
                                        {canRemove && (
                                            <button
                                                type="button"
                                                className="cep-item-del"
                                                onClick={() => {
                                                    // 删除当前证书（至少保留 1 条）
                                                    updateRoomContent('about', (c) => {
                                                        const g = c?.awards?.[awardGroup];
                                                        if (!g) return c;
                                                        const its = [...(g.items || [])];
                                                        if (its.length <= 1) return c;
                                                        its.splice(awardIdx, 1);
                                                        return { ...c, awards: { ...c.awards, [awardGroup]: { ...g, items: its } } };
                                                    });
                                                    setAwardIdx((cur) => Math.max(0, Math.min(cur, items.length - 2)));
                                                }}
                                                title="删除该证书"
                                                aria-label="删除证书"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <TextField
                                        label="证书标题（如「SOTD - GSAP」）"
                                        value={item.label}
                                        onChange={(v) => setContentPath(['awards', awardGroup, 'items', awardIdx, 'label'], v)}
                                    />
                                    <TextField
                                        label="获奖日期（如「February 13, 2026」）"
                                        value={item.date}
                                        onChange={(v) => setContentPath(['awards', awardGroup, 'items', awardIdx, 'date'], v)}
                                    />
                                    <TextField
                                        label="颁奖方链接（点击证书跳转）"
                                        value={item.url}
                                        onChange={(v) => setContentPath(['awards', awardGroup, 'items', awardIdx, 'url'], v)}
                                    />
                                    <UploadBtn
                                        dir="about"
                                        label="上传证书图（缩略图，弹层里显示）"
                                        currentUrl={item.image}
                                        onUpload={(url) => setContentPath(['awards', awardGroup, 'items', awardIdx, 'image'], url)}
                                    />
                                </div>
                                <div className="cep-item-actions">
                                    <button
                                        type="button"
                                        className="cep-btn"
                                        onClick={() => {
                                            updateRoomContent('about', (c) => {
                                                const g = c?.awards?.[awardGroup] || { items: [] };
                                                const its = [...(g.items || [])];
                                                its.push({
                                                    label: `New ${AWARD_GROUP_LABELS[awardGroup] || awardGroup}`,
                                                    date: new Date().toISOString().slice(0, 10),
                                                    image: '/textures/about/FEATURED.webp',
                                                    url: '',
                                                });
                                                return { ...c, awards: { ...c.awards, [awardGroup]: { ...g, items: its } } };
                                            });
                                            setAwardIdx(items.length);
                                        }}
                                    >
                                        + 新增证书
                                    </button>
                                    <span className="cep-count">{items.length} 条</span>
                                </div>
                            </>
                        );
                    })()}

                    {/* === 阶段 3：经历（journey）==  */}
                    {aboutPhase === 'journey' && (() => {
                        const journey = content?.journey || {};
                        const islands = journey.islands || [];
                        const island = islands[journeyIdx] || {};
                        const canRemove = islands.length > 1;
                        return (
                            <>
                                <div className="cep-item">
                                    <div className="cep-item-title">阶段标题（云上大字）</div>
                                    <TextField
                                        label="阶段标题（如「JOURNEY」）"
                                        value={journey.title}
                                        onChange={(v) => setContentPath(['journey', 'title'], v)}
                                    />
                                    <TextField
                                        label="阶段副标题（灰色小字）"
                                        value={journey.subtitle}
                                        onChange={(v) => setContentPath(['journey', 'subtitle'], v)}
                                    />
                                </div>
                                <SelectField
                                    label={`浮空岛（共 ${islands.length} 个，从左到右）`}
                                    value={String(journeyIdx)}
                                    onChange={(v) => setJourneyIdx(Number(v))}
                                >
                                    {islands.map((it, i) => (
                                        <option key={it.id || i} value={i}>{it.label || `岛 ${i + 1}`}</option>
                                    ))}
                                </SelectField>
                                <div className="cep-item">
                                    <div className="cep-item-title">
                                        {island.label || `岛 ${journeyIdx + 1}`}
                                        {canRemove && (
                                            <button
                                                type="button"
                                                className="cep-item-del"
                                                onClick={() => removeJourneyIsland(journeyIdx)}
                                                title="删除该岛"
                                                aria-label="删除岛"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <TextField
                                        label="岛上的大标签（如「U/O」「FREELANCE」）"
                                        value={island.label}
                                        onChange={(v) => setContentPath(['journey', 'islands', journeyIdx, 'label'], v)}
                                    />
                                    <TextField
                                        label="时间段（岛下方文字，如「2025-NOW」）"
                                        value={island.period}
                                        onChange={(v) => setContentPath(['journey', 'islands', journeyIdx, 'period'], v)}
                                    />
                                    <UploadBtn
                                        dir="about"
                                        label="上传岛贴图（岛的形状纹理）"
                                        currentUrl={island.image}
                                        onUpload={(url) => setContentPath(['journey', 'islands', journeyIdx, 'image'], url)}
                                    />
                                </div>
                            </>
                        );
                    })()}

                    {/* === 阶段 4：技能（skills）==  */}
                    {aboutPhase === 'skills' && (() => {
                        const skills = content?.skills || {};
                        const items = skills.items || [];
                        const item = items[skillIdx] || {};
                        const canRemove = items.length > 1;
                        return (
                            <>
                                <div className="cep-item">
                                    <div className="cep-item-title">阶段标题</div>
                                    <TextField
                                        label="阶段标题（如「SKILLS」）"
                                        value={skills.title}
                                        onChange={(v) => setContentPath(['skills', 'title'], v)}
                                    />
                                    <TextField
                                        label="阶段副标题（灰色小字）"
                                        value={skills.subtitle}
                                        onChange={(v) => setContentPath(['skills', 'subtitle'], v)}
                                    />
                                </div>
                                <SelectField
                                    label={`气球（共 ${items.length} 个，点击 3D 中的气球会爆炸显示 label）`}
                                    value={String(skillIdx)}
                                    onChange={(v) => setSkillIdx(Number(v))}
                                >
                                    {items.map((it, i) => (
                                        <option key={i} value={i}>{it.label || `技能 ${i + 1}`}（{it.size}）</option>
                                    ))}
                                </SelectField>
                                <div className="cep-item">
                                    <div className="cep-item-title">
                                        {item.label || `技能 ${skillIdx + 1}`}
                                        {canRemove && (
                                            <button
                                                type="button"
                                                className="cep-item-del"
                                                onClick={() => removeSkillItem(skillIdx)}
                                                title="删除该气球"
                                                aria-label="删除气球"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <TextField
                                        label="技能名（点击气球后显示的文字）"
                                        value={item.label}
                                        onChange={(v) => setContentPath(['skills', 'items', skillIdx, 'label'], v)}
                                    />
                                    <SelectField
                                        label="气球尺寸（决定大小）"
                                        value={item.size || 'small'}
                                        onChange={(v) => setContentPath(['skills', 'items', skillIdx, 'size'], v)}
                                    >
                                        <option value="large">大（主要技能）</option>
                                        <option value="medium">中（散布）</option>
                                        <option value="small">小（背景）</option>
                                    </SelectField>
                                    <UploadBtn
                                        dir="about"
                                        label="上传素描气球贴图"
                                        currentUrl={item.texture}
                                        onUpload={(url) => setContentPath(['skills', 'items', skillIdx, 'texture'], url)}
                                    />
                                    <UploadBtn
                                        dir="about"
                                        label="上色气球贴图（hover 时显示）"
                                        currentUrl={item.paintedTexture}
                                        onUpload={(url) => setContentPath(['skills', 'items', skillIdx, 'paintedTexture'], url)}
                                    />
                                </div>
                                <div className="cep-item-actions">
                                    <button type="button" className="cep-btn" onClick={addSkillItem}>+ 新增气球</button>
                                    <span className="cep-count">{items.length} 个</span>
                                </div>
                            </>
                        );
                    })()}
                </div>
            );
        }

        if (roomId === 'contact') {
            const socials = content?.socials || [];
            return (
                <div className="cep-room">
                    <div className="cep-item">
                        <TextField
                            label="收件邮箱（MESSAGE 桶 → mailto）"
                            value={content?.email || ''}
                            onChange={(v) => setContentPath(['email'], v)}
                        />
                    </div>
                    <div className="cep-section-title">社交链接（桶）</div>
                    {socials.map((s, i) => (
                        <div className="cep-item" key={s.id || `social-${i}`}>
                            <div className="cep-item-title">
                                {s.label || `链接 ${i + 1}`}
                                {socials.length > 1 && (
                                    <button
                                        type="button"
                                        className="cep-item-del"
                                        onClick={() => removeSocial(i)}
                                        title="删除该链接"
                                        aria-label="删除链接"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <TextField label="显示文字" value={s.label || ''} onChange={(v) => setSocialField(i, 'label', v)} />
                            <TextField label="链接 URL" value={s.url || ''} onChange={(v) => setSocialField(i, 'url', v)} />
                        </div>
                    ))}
                </div>
            );
        }

        return null;
    };

    // ============ 走廊门编辑器 ============
    const renderCorridorEditor = () => (
        <div className="cep-room">
            <SelectField label="选择房间（走廊门）" value={corridorRoomId} onChange={(v) => setCorridorRoomId(v)}>
                {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.label || r.id}</option>
                ))}
            </SelectField>
            <div className="cep-item">
                <div className="cep-item-title">门配置</div>
                <TextField label="门牌文字 (label)" value={doorRoom?.label} onChange={(v) => setDoorField('label', v)} />
                <TextField label="短名 (shortLabel)" value={doorRoom?.shortLabel} onChange={(v) => setDoorField('shortLabel', v)} />
                <SelectField label="门侧 (side)" value={doorRoom?.side} onChange={(v) => setDoorField('side', v)}>
                    <option value="left">左 (left)</option>
                    <option value="right">右 (right)</option>
                </SelectField>
                <TextField label="门位置 (relativeZ) 建议 -14 ~ -72" value={doorRoom?.relativeZ} onChange={(v) => setDoorField('relativeZ', Number(v) || 0)} />
                <TextField label="门面贴图 (textures.door)" value={doorRoom?.textures?.door} onChange={(v) => setDoorTexture('door', v)} />
                <TextField label="上色贴图 (doorPainted)" value={doorRoom?.textures?.doorPainted} onChange={(v) => setDoorTexture('doorPainted', v)} />
            </div>

            <div className="cep-section-title">走廊场景贴图</div>
            <p className="cep-phase-hint">地板 / 天花板 / 墙 / 门通用件 / 装饰均可换；上传后点「保存」生效</p>
            <CorridorTextureFields textures={corridorTextures} onUpdate={updateCorridorTexture} />
        </div>
    );

    return (
        <>
            <button
                type="button"
                className={`cep-toggle ${open ? 'active' : ''}`}
                onClick={() => setOpen((o) => !o)}
                title="实时编辑 (E)"
                aria-label="实时编辑"
            >
                ✏️
            </button>

            {open && (
                <div className="cep-panel" role="dialog" aria-label="实时编辑面板">
                    <div className="cep-header">
                        <h3>实时编辑</h3>
                        <span className="cep-hint">E / Esc 开关</span>
                        <button type="button" className="cep-close" onClick={() => setOpen(false)} aria-label="关闭">×</button>
                    </div>

                    {/* 标签页切换 */}
                    <div className="cep-tabs">
                        <button
                            type="button"
                            className={`cep-tab ${activeTab === 'outdoor' ? 'active' : ''}`}
                            onClick={() => setActiveTab('outdoor')}
                        >
                            屋外
                        </button>
                        <button
                            type="button"
                            className={`cep-tab ${activeTab === 'home' ? 'active' : ''}`}
                            onClick={() => setActiveTab('home')}
                        >
                            走廊
                        </button>
                        <button
                            type="button"
                            className={`cep-tab ${activeTab === 'corridor' ? 'active' : ''}`}
                            onClick={() => setActiveTab('corridor')}
                        >
                            走廊门
                        </button>
                        <button
                            type="button"
                            className={`cep-tab ${activeTab === 'content' ? 'active' : ''}`}
                            onClick={() => setActiveTab('content')}
                        >
                            房间内容
                        </button>
                    </div>

                    <div className="cep-body">
                        {activeTab === 'content' ? (
                            <>
                                <SelectField label="选择房间" value={roomId} onChange={(v) => setRoomId(v)}>
                                    {ROOM_OPTIONS.map((r) => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </SelectField>
                                {renderContentEditor()}
                            </>
                        ) : activeTab === 'corridor' ? (
                            renderCorridorEditor()
                        ) : activeTab === 'home' ? (
                            renderHomeEditor()
                        ) : (
                            renderOutdoorEditor()
                        )}
                    </div>
                    <div className="cep-footer">
                        <button type="button" className="cep-btn" onClick={handleReset}>恢复默认</button>
                        <button type="button" className="cep-btn primary" onClick={handleSave}>保存修改</button>
                        {saveMsg && <div className="cep-msg">{saveMsg}</div>}
                    </div>
                </div>
            )}
        </>
    );
};

export default ContentEditorPanel;
