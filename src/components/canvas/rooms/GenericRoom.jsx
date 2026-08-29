import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSiteConfig } from '../../../context/SiteConfigContext';

// ============================================
// ROOM CONFIG - generic room shell dimensions
// ============================================
const ROOM_CONFIG = {
    corridorWidth: 2.2,
    corridorHeight: 2.4,
    corridorDepth: 2,
    roomWidth: 30,
    roomHeight: 20,
    roomDepth: 25,
};

/**
 * GenericRoom — 通用占位房间
 *
 * 当 rooms[].type 在注册表里找不到对应组件时，使用本组件作为兜底。
 *
 * ⚠️ 布局契约：所有房间组件都相对「房间入口」（RoomInterior 的
 * [0, -0.5, -corridorDepth] 挂点）布局。本组件内部自行补偿房间中心位置。
 *
 * 它渲染一个带标题/副标题的空房间，用户可以把任意内容塞进
 * rooms[].content（按需在这里读取渲染）。
 */
const GenericRoom = ({ label, subtitle }) => {
    const { fontForText } = useSiteConfig();
    const { roomWidth, roomHeight, roomDepth } = ROOM_CONFIG;

    // 补偿：使房间地板对齐入口走廊地板高度、房间中心位于入口前方
    const roomOffsetY = roomHeight / 2 - ROOM_CONFIG.corridorHeight / 2 + 0.5;
    const roomOffsetZ = -roomDepth / 2;

    // Memoize geometries
    const geometries = useMemo(() => ({
        roomFloorCeiling: new THREE.PlaneGeometry(roomWidth, roomDepth),
        roomSideWall: new THREE.PlaneGeometry(roomDepth, roomHeight),
        roomBackWall: new THREE.PlaneGeometry(roomWidth, roomHeight),
    }), [roomWidth, roomDepth, roomHeight]);

    // 简单兜底材质（可换成主题色）
    const materials = useMemo(() => ({
        roomFloor: new THREE.MeshBasicMaterial({ color: '#e5e5e5', side: THREE.DoubleSide }),
        roomCeiling: new THREE.MeshBasicMaterial({ color: '#fafafa', side: THREE.DoubleSide }),
        roomWall: new THREE.MeshBasicMaterial({ color: '#f0f0f0', side: THREE.DoubleSide }),
        roomBackWall: new THREE.MeshBasicMaterial({ color: '#f5f5f5', side: THREE.DoubleSide }),
    }), []);

    return (
        <group position={[0, roomOffsetY, roomOffsetZ]}>
            {/* Floor */}
            <mesh position={[0, -roomHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometries.roomFloorCeiling} material={materials.roomFloor} />
            {/* Floor grid */}
            <gridHelper args={[Math.min(roomWidth, roomDepth), 20, '#cccccc', '#dddddd']} position={[0, -roomHeight / 2 + 0.01, 0]} />
            {/* Ceiling */}
            <mesh position={[0, roomHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geometries.roomFloorCeiling} material={materials.roomCeiling} />
            {/* Back wall */}
            <mesh position={[0, 0, -roomDepth / 2]} geometry={geometries.roomBackWall} material={materials.roomBackWall} />
            {/* Left wall */}
            <mesh position={[-roomWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} geometry={geometries.roomSideWall} material={materials.roomWall} />
            {/* Right wall */}
            <mesh position={[roomWidth / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={geometries.roomSideWall} material={materials.roomWall} />

            {/* Title (on back wall) */}
            <Text position={[0, 2, -roomDepth / 2 + 2]} fontSize={4} color="#1a1a1a" anchorX="center" anchorY="middle" maxWidth={roomWidth * 0.8} textAlign="center" font={fontForText(label)} overflowWrap={/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(label || '') ? 'break-word' : 'normal'}>
                {label}
            </Text>
            {/* Subtitle */}
            <Text position={[0, -1, -roomDepth / 2 + 2]} fontSize={0.8} color="#666666" anchorX="center" anchorY="middle" maxWidth={roomWidth * 0.7} textAlign="center" font={fontForText(subtitle)} overflowWrap={/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(subtitle || '') ? 'break-word' : 'normal'}>
                {subtitle || ''}
            </Text>
        </group>
    );
};

export default GenericRoom;
