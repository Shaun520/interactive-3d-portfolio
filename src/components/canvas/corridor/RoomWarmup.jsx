import { useRef, useState, useMemo, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { getRoomComponent } from '../../../config/rooms/registry';
import { useRooms } from '../../../context/SiteConfigContext';

/**
 * RoomWarmup Component
 * 
 * Mounts all 4 rooms off-screen during the preloader phase to force
 * shader compilation and texture upload to GPU. After a few frames,
 * it unmounts the rooms to free memory. This ensures the first room
 * entry has zero shader compilation stutter.
 * 
 * Positioned 500 units below the scene so nothing is visible.
 * Audio components won't be audible at this distance.
 */
const RoomWarmup = ({ onWarmupComplete, isLowTier }) => {
    const [isDone, setIsDone] = useState(false);
    const frameCount = useRef(0);
    const completeFired = useRef(false);
    const { gl, scene, camera } = useThree();

    // 预热房间清单：遍历所有已启用房间，错落排布在屏幕下方 500 单位处
    // 用 useRooms() 拿到可变 content，与实时编辑保持同步
    const rooms = useRooms();
    const warmupRooms = useMemo(() => rooms.map((room, i) => ({
        id: room.id,
        component: getRoomComponent(room.type),
        content: room.content,
        position: [i % 2 === 0 ? -20 : 20, 0, -Math.floor(i / 2) * 50],
    })), [rooms]);

    // Wait for rooms to render a few frames, then compile and unmount
    const warmupStart = useRef(performance.now());

    useFrame(() => {
        if (isDone || completeFired.current) return;

        frameCount.current++;

        // For low tier, we skip warmup, but still wait 1 frame for entrance to mount
        const targetFrames = isLowTier ? 1 : 3;

        if (frameCount.current >= targetFrames) {
            completeFired.current = true;

            const finishWarmup = () => {
                const warmupDuration = ((performance.now() - warmupStart.current) / 1000).toFixed(2);
                // console.info(`🔥 GPU/Shader Warmup Complete: ${warmupDuration}s ${isLowTier ? '(Bypassed for LOW tier)' : ''}`);
                
                requestAnimationFrame(() => {
                    setIsDone(true);
                    onWarmupComplete?.();
                });
            };

            // On low tier, bypass intense gl.compileAsync to save memory and avoid Context Lost
            if (isLowTier) {
                finishWarmup();
                return;
            }

            // Force compile all shaders in the scene (including warm-up rooms)
            // Use 2026 compileAsync to avoid blocking the main thread!
            if (gl.compileAsync) {
                gl.compileAsync(scene, camera, scene)
                    .then(finishWarmup)
                    .catch((err) => {
                        console.error('Async compilation failed, falling back to sync', err);
                        gl.compile(scene, camera);
                        finishWarmup();
                    });
            } else {
                gl.compile(scene, camera);
                finishWarmup();
            }
        }
    });

    if (isDone) return null;

    // Do not mount rooms at all on low end devices to prevent WebGL Context Lost
    if (isLowTier) return null;

    // Dummy handlers to prevent errors (rooms expect these props)
    const noop = () => {};

    return (
        <group position={[0, -500, 0]}>
            {/* Mount all configured rooms in Suspense - positioned far below camera */}
            {warmupRooms.map((room) => (
                <Suspense fallback={null} key={`warmup-${room.id}`}>
                    <group position={room.position}>
                        <room.component showRoom={true} onReady={noop} isExiting={false} isWarmup={true} content={room.content} />
                    </group>
                </Suspense>
            ))}
        </group>
    );
};

export default RoomWarmup;
