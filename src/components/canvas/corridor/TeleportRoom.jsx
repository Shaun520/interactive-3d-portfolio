import { memo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useScene } from '../../../context/SceneContext';
import { resolveDoorZ } from '../../../context/SiteConfigContext';
import { siteConfig } from '../../../site.config';

// Door positions (Global Z for Segment 0), 由配置 rooms[].relativeZ 计算：
// Z = 10 (Start Z) + relativeZ + 2 (Door Offset)
const DOOR_POSITIONS_Z = siteConfig.rooms.reduce((acc, room) => {
    acc[room.id] = resolveDoorZ(room.relativeZ);
    return acc;
}, {});

/**
 * TeleportRoom Component
 * 
 * Handles moving the camera to the correct corridor position during teleport.
 * Instead of rendering the room, it:
 * 1. Moves camera to ~8 units before the door
 * 2. During FAST teleport: triggers completeTeleport immediately (paper stays closed)
 * 3. During normal teleport: signals PaperTransition to open
 * 4. SceneContext then triggers 'pendingDoorClick' which DoorSection picks up
 */
const TeleportRoom = memo(() => {
    const {
        teleportTarget,
        teleportPhase,
        openTeleportTransition,
        completeTeleport,
        isFastTeleport,
        isTeleporting
    } = useScene();
    const { camera } = useThree();
    const hasPositioned = useRef(false);

    // Position camera when entering 'teleporting' phase
    useEffect(() => {
        if (teleportPhase === 'teleporting' && teleportTarget && !hasPositioned.current) {
            const doorZ = DOOR_POSITIONS_Z[teleportTarget];

            if (doorZ !== undefined) {
                // Place camera 8 units "before" the door (towards positive Z)
                // Center of corridor (X=0)
                // Height standard (Y=0.2)
                const targetZ = doorZ + 8;

                // Instantly teleport camera
                camera.position.set(0, 0.2, targetZ);

                // Reset rotation to look straight down corridor (towards negative Z)
                // This ensures we start "neutral" before the door click animation takes over
                camera.rotation.set(0, 0, 0);

                hasPositioned.current = true;

                // Small delay to ensure frame update
                setTimeout(() => {
                    if (isFastTeleport) {
                        // FAST TELEPORT: Skip paper open, go straight to door click
                        // Paper stays closed, DoorSection will call signalRoomReady when done
                        completeTeleport();
                    } else {
                        // NORMAL TELEPORT: Open paper first (not currently used, but kept for flexibility)
                        openTeleportTransition();
                    }
                }, 50);
            }
        }

        // Reset flag when teleportation ends
        if (!isTeleporting) {
            hasPositioned.current = false;
        }
    }, [teleportPhase, teleportTarget, isTeleporting, isFastTeleport, camera, openTeleportTransition, completeTeleport]);

    // Don't render anything - we just manipulate camera
    return null;
});

TeleportRoom.displayName = 'TeleportRoom';

export default TeleportRoom;
