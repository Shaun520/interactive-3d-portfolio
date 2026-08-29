/**
 * =============================================================================
 * FONT CATALOG — 全局通用字体名册
 * =============================================================================
 *
 * 每个字体选项 = 一套「英文 3D + 中文 3D + DOM CSS」：
 *   english3D  用于英文/数字为主的 3D <Text>（门牌、首页大标题、副标题、走廊装饰）
 *   chinese3D  用于含中文的 3D <Text>（项目卡片描述等；中文字体同时含英文/数字字形）
 *   domCss     用于 DOM 界面（编辑面板、覆盖卡片等），是一次浏览器可用的字体族。
 *
 * 3D 的 drei <Text>/troika 必须用真实字体文件 URL（TTF/OTF），浏览器端 @font-face 对 3D 不生效，
 * 因此 english3D / chinese3D 都是自托管到 public/fonts/ 的字体文件路径。
 * 每个 <Text> 只允许一个字体 → 中英配对靠"不同使用点用不同字体的 TTF"实现。
 *
 * 授权：仅收录 OFL / SIL 免费商用手写/草图风格字体。
 * 中文体 TTF 通常 ≥4MB，为控制 public 体积，未真正下载安装的选项标记 available:false，
 * 选择器会将其「解锁锁定」：只到字体文件确实存在时才允许选用。
 * =============================================================================
 */

// 检查某个字体文件是否已被自托管到 public/fonts/（用于选择器禁用未安装项）
// 默认认为已安装；标注 available 后按文件路径探测。
const DEFAULT_FONT_FILE = '/fonts/CabinSketch-Bold.ttf';
const DEFAULT_CJK_FONT_FILE = '/fonts/LongCang-Regular.ttf';

export const FONT_OPTIONS = [
    // ---------------- 英文字体（3D 标题 / 门牌 / 副标题 / 装饰） ----------------
    {
        id: 'sketch',
        category: 'en',
        label: 'Cabin Sketch（手绘草图）',
        english3D: DEFAULT_FONT_FILE,
        chinese3D: DEFAULT_CJK_FONT_FILE,
        domCss: "'Cabin Sketch', 'Long Cang', cursive",
        available: true, // 已自托管
    },
    {
        id: 'rubik-scribble',
        category: 'en',
        label: 'Rubik Scribble（潦草）',
        english3D: '/fonts/RubikScribble-Regular.ttf',
        chinese3D: DEFAULT_CJK_FONT_FILE,
        domCss: "'Rubik Scribble', 'Long Cang', cursive",
        available: true, // 已自托管
    },
    {
        id: 'fredericka',
        category: 'en',
        label: 'Fredericka the Great（复古装饰）',
        english3D: '/fonts/FrederickatheGreat-Regular.ttf',
        chinese3D: DEFAULT_CJK_FONT_FILE,
        domCss: "'Fredericka the Great', 'Long Cang', cursive",
        available: true, // 已自托管
    },
    {
        id: 'special-elite',
        category: 'en',
        label: 'Special Elite（打字机复古）',
        english3D: '/fonts/SpecialElite-Regular.ttf',
        chinese3D: DEFAULT_CJK_FONT_FILE,
        domCss: "'Special Elite', 'Long Cang', cursive",
        available: true, // 已自托管
    },
    {
        id: 'patrick-hand',
        category: 'en',
        label: 'Patrick Hand（圆滑手写）',
        english3D: '/fonts/PatrickHand-Regular.ttf',
        chinese3D: DEFAULT_CJK_FONT_FILE,
        domCss: "'Patrick Hand', 'Long Cang', cursive",
        available: true, // 已自托管
    },
    {
        id: 'gochi-hand',
        category: 'en',
        label: 'Gochi Hand（孩童手写）',
        english3D: '/fonts/GochiHand-Regular.ttf',
        chinese3D: DEFAULT_CJK_FONT_FILE,
        domCss: "'Gochi Hand', 'Long Cang', cursive",
        available: true, // 已自托管
    },

    // ---------------- 中文字体（含中文的描述文本） ----------------
    {
        id: 'longcang',
        category: 'zh',
        label: 'Long Cang · 龙藏（手写钢笔）',
        english3D: DEFAULT_FONT_FILE,
        chinese3D: DEFAULT_CJK_FONT_FILE,
        domCss: "'Long Cang', 'Cabin Sketch', cursive",
        available: true, // 已自托管
    },
    {
        id: 'zcool-xiaowei',
        category: 'zh',
        label: 'ZCOOL XiaoWei · 站酷小薇（细手写）',
        english3D: DEFAULT_FONT_FILE,
        chinese3D: '/fonts/ZCOOL-XiaoWei-Regular.ttf',
        domCss: "'ZCOOL XiaoWei', 'Cabin Sketch', cursive",
        available: true, // 已自托管
    },
    {
        id: 'zcool-kuai-le',
        category: 'zh',
        label: 'ZCOOL KuaiLe · 站酷快乐体（圆润卡通）',
        english3D: DEFAULT_FONT_FILE,
        chinese3D: '/fonts/ZCOOL-KuaiLe-Regular.ttf',
        domCss: "'ZCOOL KuaiLe', 'Cabin Sketch', cursive",
        available: true, // 已自托管
    },
];

/** 默认英文 / 中文字体 id（与 site.config.js 默认一致） */
export const DEFAULT_ENGLISH_FONT_ID = 'sketch';
export const DEFAULT_CHINESE_FONT_ID = 'longcang';

/** 按 id 查字体选项；找不到返回 null */
export const getFontById = (id) => FONT_OPTIONS.find((f) => f.id === id) || null;

/**
 * 解析当前选中的「英文 / 中文」选项 + DOM css。
 * @param {string} englishId
 * @param {string} chineseId
 */
export const resolveFonts = (englishId = DEFAULT_ENGLISH_FONT_ID, chineseId = DEFAULT_CHINESE_FONT_ID) => {
    const en = getFontById(englishId) || getFontById(DEFAULT_ENGLISH_FONT_ID);
    const cn = getFontById(chineseId) || getFontById(DEFAULT_CHINESE_FONT_ID);
    // 全局 body 字体：中文优先（中文字体一般自带英文字形），缺省用英文
    const globalDomCss = cn?.domCss || en?.domCss || "'Cabin Sketch', cursive";
    return {
        selectedEnglish: en?.id || DEFAULT_ENGLISH_FONT_ID,
        selectedChinese: cn?.id || DEFAULT_CHINESE_FONT_ID,
        englishFont3D: en?.english3D || DEFAULT_FONT_FILE,
        chineseFont3D: cn?.chinese3D || DEFAULT_CJK_FONT_FILE,
        domCss: globalDomCss,
        englishDomCss: en?.domCss || "'Cabin Sketch', cursive",
    };
};