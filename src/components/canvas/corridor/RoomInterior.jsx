import { useMemo, memo, Suspense, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { getRoomComponent } from '../../../config/rooms/registry';
import { siteConfig } from '../../../site.config';
import { useRooms } from '../../../context/SiteConfigContext';

// 这些内置房间组件内部会自行调用 onReady，RoomInterior 不需要代调
const SELF_READY_TYPES = ['gallery', 'studio', 'about', 'contact'];

// Room configurations
const ROOM_CONFIG = {
    corridorWidth: 2.2,   // Wider "vestibule" feeling
    corridorHeight: 2.4,  // frameHeight - 0.1
    corridorDepth: 2,     // Shorter - quick transition
    roomWidth: 30,
    roomHeight: 20,
    roomDepth: 25
};

// Naturalny kafelek listwy: 1582x94px przy wysokości 0.15 → ~2.524 units szerokości
const NATURAL_TILE_W = (1582 / 94) * 0.15;

/**
 * RoomInterior Component
 *
 * Memoized room geometry to prevent re-renders and improve performance.
 * Contains corridor + room at the end. Room rendering goes through the
 * room registry (rooms[].type → component), so rooms are pluggable.
 */
const RoomInterior = memo(({ label, showRoom, onReady, isExiting }) => {
    const { corridorWidth, corridorHeight, corridorDepth } = ROOM_CONFIG;
    const halfDepth = corridorDepth / 2;

    // 当前房间配置（由门 label 反查 rooms，rooms[].content 可变，实时编辑会反映到这里）
    const rooms = useRooms();
    const room = useMemo(() => rooms.find(r => r.label === label) || { type: 'generic', subtitle: '' }, [rooms, label]);
    const RoomComponent = useMemo(() => getRoomComponent(room.type), [room.type]);

    // Load corridor textures
    const floorTexSrc = useTexture(siteConfig.theme.assets.floorTexture);
    const wallTexSrc = useTexture(siteConfig.theme.assets.wallTexture);
    const ceilingTexSrc = useTexture(siteConfig.theme.assets.ceilingTexture);
    const bbTexSrc = useTexture(siteConfig.theme.assets.baseboardTexture);

    // Memoize textured materials for mini-corridor
    const materials = useMemo(() => {
        // Floor
        const floorTex = floorTexSrc.clone();
        floorTex.needsUpdate = true;
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(corridorDepth / 2.5, corridorWidth / 2.5);

        // Left wall
        const wallTexL = wallTexSrc.clone();
        wallTexL.needsUpdate = true;
        wallTexL.wrapS = wallTexL.wrapT = THREE.RepeatWrapping;
        wallTexL.repeat.set(corridorDepth / 2, corridorHeight / 2);

        // Right wall (same settings)
        const wallTexR = wallTexSrc.clone();
        wallTexR.needsUpdate = true;
        wallTexR.wrapS = wallTexR.wrapT = THREE.RepeatWrapping;
        wallTexR.repeat.set(corridorDepth / 2, corridorHeight / 2);

        // Ceiling
        const ceilTex = ceilingTexSrc.clone();
        ceilTex.needsUpdate = true;
        ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
        ceilTex.repeat.set(corridorDepth / 2.5, corridorWidth / 2.5);

        // Baseboard left
        const bbLeft = bbTexSrc.clone();
        bbLeft.needsUpdate = true;
        bbLeft.wrapS = bbLeft.wrapT = THREE.RepeatWrapping;
        bbLeft.rotation = 0;
        bbLeft.offset.set(0, 0);
        bbLeft.repeat.set(corridorDepth / NATURAL_TILE_W, 1);

        // Baseboard right
        const bbRight = bbTexSrc.clone();
        bbRight.needsUpdate = true;
        bbRight.wrapS = bbRight.wrapT = THREE.RepeatWrapping;
        bbRight.rotation = 0;
        bbRight.offset.set(0, 0);
        bbRight.repeat.set(corridorDepth / NATURAL_TILE_W, 1);

        return {
            corridorFloor: new THREE.MeshBasicMaterial({ color: '#e0e0e0', map: floorTex, side: THREE.DoubleSide }),
            corridorWallL: new THREE.MeshBasicMaterial({ color: '#e0e0e0', map: wallTexL, side: THREE.DoubleSide }),
            corridorWallR: new THREE.MeshBasicMaterial({ color: '#e0e0e0', map: wallTexR, side: THREE.DoubleSide }),
            corridorCeiling: new THREE.MeshBasicMaterial({ color: '#e0e0e0', map: ceilTex, side: THREE.DoubleSide }),
            bbLeft: new THREE.MeshBasicMaterial({ color: '#e0e0e0', map: bbLeft, side: THREE.DoubleSide }),
            bbRight: new THREE.MeshBasicMaterial({ color: '#e0e0e0', map: bbRight, side: THREE.DoubleSide }),
            threshold: new THREE.MeshBasicMaterial({ color: '#e0e0e0',
                map: (() => {
                    const t = bbTexSrc.clone();
                    t.needsUpdate = true;
                    t.wrapS = t.wrapT = THREE.RepeatWrapping;
                    t.rotation = 0;
                    t.offset.set(0, 0);
                    t.repeat.set(corridorWidth / NATURAL_TILE_W, 1);
                    return t; })(),
                side: THREE.DoubleSide
            }),
        };
    }, [floorTexSrc, wallTexSrc, ceilingTexSrc, bbTexSrc, corridorDepth, corridorWidth, corridorHeight]);

    // Memoize geometries
    const geometries = useMemo(() => ({
        corridorSideWall: new THREE.PlaneGeometry(corridorDepth, corridorHeight),
        corridorFloorCeiling: new THREE.PlaneGeometry(corridorWidth, corridorDepth),
        corridorBaseboard: new THREE.PlaneGeometry(corridorDepth, 0.15),
        threshold: new THREE.PlaneGeometry(corridorWidth, 0.15),
    }), [corridorDepth, corridorHeight, corridorWidth]);

    // Trigger onReady for rooms that don't self-signal (generic & custom non-ready types)
    useEffect(() => {
        if (showRoom && !SELF_READY_TYPES.includes(room.type)) {
            onReady?.();
        }
    }, [showRoom, room.type, onReady]);

    return (
        <group position={[0, -0.149, 0]}>
            {/* === CORRIDOR (The "Mini-Corridor" Transition) === */}
            {/* Left wall */}
            <mesh
                position={[-corridorWidth / 2, 0, -halfDepth]}
                rotation={[0, Math.PI / 2, 0]}
                geometry={geometries.corridorSideWall}
                material={materials.corridorWallL}
            />

            {/* Right wall */}
            <mesh
                position={[corridorWidth / 2, 0, -halfDepth]}
                rotation={[0, -Math.PI / 2, 0]}
                geometry={geometries.corridorSideWall}
                material={materials.corridorWallR}
            />

            {/* Floor */}
            <mesh
                position={[0, -corridorHeight / 2, -halfDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometries.corridorFloorCeiling}
                material={materials.corridorFloor}
            />

            {/* Ceiling */}
            <mesh
                position={[0, corridorHeight / 2, -halfDepth]}
                rotation={[Math.PI / 2, 0, 0]}
                geometry={geometries.corridorFloorCeiling}
                material={materials.corridorCeiling}
            />

            {/* Baseboard Left */}
            <mesh
                position={[-corridorWidth / 2 + 0.01, -corridorHeight / 2 + 0.075, -halfDepth]}
                rotation={[0, Math.PI / 2, 0]}
                geometry={geometries.corridorBaseboard}
                material={materials.bbLeft}
            />

            {/* Baseboard Right */}
            <mesh
                position={[corridorWidth / 2 - 0.01, -corridorHeight / 2 + 0.075, -halfDepth]}
                rotation={[0, -Math.PI / 2, 0]}
                geometry={geometries.corridorBaseboard}
                material={materials.bbRight}
            />

            {/* === THRESHOLD (End of Mini-Corridor) === */}
            <mesh
                position={[0, -corridorHeight / 2 + 0.005, -corridorDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometries.threshold}
                material={materials.threshold}
            />

            {/* === ROOM CONTENT === */}
            {/* 统一挂载点：所有房间组件都相对「房间入口」布局（见 GenericRoom 说明） */}
            {showRoom && (
                <group>
                    <group position={[0, -0.5, -corridorDepth]}>
                        <Suspense fallback={null}>
                            <RoomComponent showRoom={showRoom} onReady={onReady} isExiting={isExiting} content={room.content} />
                        </Suspense>
                    </group>
                </group>
            )}
        </group>
    );
});

RoomInterior.displayName = 'RoomInterior';

export default RoomInterior;
