import GalleryRoom from '../../components/canvas/rooms/Gallery/GalleryRoom';
import StudioRoom from '../../components/canvas/rooms/Studio/StudioRoom';
import AboutRoom from '../../components/canvas/rooms/About/AboutRoom';
import ContactRoom from '../../components/canvas/rooms/Contact/ContactRoom';
import GenericRoom from '../../components/canvas/rooms/GenericRoom';

/**
 * =============================================================================
 * 房间注册表 (Room Registry)
 * =============================================================================
 *
 * 把「房间类型 (type)」映射到「3D 房间组件」。
 * rooms[].type 在 site.config.js 中声明，走廊/预热/传送等统一通过
 * getRoomComponent(type) 拿到组件，不再散落 if/else。
 *
 * 内置类型：gallery / studio / about / contact / generic（兜底）
 *
 * 自定义房间：调用 registerRoomType('mytype', MyRoom) 注册你自己的组件，
 * 然后 rooms 配置里写 { type: 'mytype' } 即可渲染，无需改核心代码。
 * =============================================================================
 */

const BUILT_IN_ROOM_TYPES = {
    gallery: GalleryRoom,
    studio: StudioRoom,
    about: AboutRoom,
    contact: ContactRoom,
    generic: GenericRoom,
};

const customRoomTypes = {};

/**
 * 注册自定义房间类型
 * @param {string} type 房间类型 ID（对应 site.config.js rooms[].type）
 * @param {React.Component} component 3D 房间组件（接收 showRoom/onReady/isExiting/isWarmup props）
 */
export function registerRoomType(type, component) {
    customRoomTypes[type] = component;
}

/**
 * 根据类型获取房间组件（未找到时回退 GenericRoom）
 */
export function getRoomComponent(type) {
    return BUILT_IN_ROOM_TYPES[type] || customRoomTypes[type] || GenericRoom;
}

/** 内置类型列表（CLI / 文档用） */
export const KNOWN_ROOM_TYPES = Object.keys(BUILT_IN_ROOM_TYPES);

export default BUILT_IN_ROOM_TYPES;
