import { useRef, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSiteConfig } from '../../../context/SiteConfigContext';

/**
 * SignSystem Component
 *
 * 屋外入口的木牌系统。上方是吊装横木，下方是木牌本体（贴图）。
 * 木牌大字文字编辑已从编辑面板移除，这里只渲染木牌贴图背景。
 */
const SignSystem = (props) => {
    const groupRef = useRef();
    const { outdoorContent } = useSiteConfig();
    const signUrl = outdoorContent?.textures?.sign || '/textures/entrance/sign.webp';
    const signTexture = useTexture(signUrl);
    const mountTexture = useTexture('/textures/entrance/belka.webp');

    // Physics parameters
    const timeOffset = useMemo(() => Math.random() * 100, []);

    useFrame((state) => {
        if (groupRef.current) {
            // Simple wind sway (idle animation only)
            const time = state.clock.elapsedTime + timeOffset;
            const windSway = Math.sin(time * 2) * 0.05; // Gentle constant sway

            groupRef.current.rotation.x = windSway;
            groupRef.current.rotation.y = 0;
        }
    });

    return (
        <group {...props}>
            {/* 1. THE MOUNT (Visual Anchor) */}
            {/* Texture is horizontal, so we use Width=3.5, Height=0.4 (approx aspect ratio) */}
            {/* No rotation needed as the texture is already horizontal */}
            <mesh position={[-0.05, 2.05, 0.65]}>
                <planeGeometry args={[2.7, 0.4]} />
                <meshBasicMaterial color="#e0e0e0" map={mountTexture} transparent={true} side={THREE.DoubleSide} />
            </mesh>

            {/* 2. THE SIGN (SignGroup) */}
            {/* Positioned exactly at the center of the mounting bar */}
            <group
                ref={groupRef}
                position={[0, 1.9, 0.60]}
            >
                {/* 3. THE PIVOT FIX */}
                {/* Translate geometry DOWN so the top edge (where chains are) is at (0,0,0) of the group */}
                <mesh
                    position={[0, -0.5, 0]} // Moving down by half height (assuming height ~1)
                >
                    {/* Width 2.6 (Narrower), Height 1 */}
                    <planeGeometry args={[2, 1]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={signTexture}
                        transparent={true}
                        side={THREE.DoubleSide}
                        depthWrite={false} // Fix for seeing objects behind transparent parts
                    />
                </mesh>

                {/* 4. THE TEXT (User-editable, overlays sign) */}
                {/* 木牌大字编辑已移除，不再叠加文字；仅保留贴图本身的图案 */}
            </group>
        </group>
    );
};

export default SignSystem;
