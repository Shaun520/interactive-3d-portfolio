import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSiteConfig } from '../../../context/SiteConfigContext';

// Local fonts for sketch-style typography (TTF format required by troika)
// 字体现从全局选择按内容自动判断（fontForText），见下方 useSiteConfig()

/**
 * HeroText Component - Hand-drawn Style with Sketch Fonts
 * 
 * WOW Effects for Awwwards SOTD:
 * - ITOM in selected English font (splits into letters during scroll)
 * - Creative developer in selected English font (also splits)
 * - Floating micro-animations
 * - Parallax split effect
 * - RESPONSIVE: scales down on mobile
 * 
 * 文字来自首页配置（homeContent.title / tagline），逐字母拆开做分裂动画。
 */
const HeroText = ({ position = [0, 0.3, 0] }) => {
    const { homeContent, fontForText } = useSiteConfig();
    const title = homeContent?.title || 'ITOM';
    const tagline = homeContent?.tagline || '< creative developer />';

    const groupRef = useRef();
    const letterRefs = useRef([]);
    const taglineRefs = useRef([]);
    const { camera } = useThree();

    // Responsive scale based on screen width - FLUID (no breakpoints)
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            const minWidth = 320;
            const maxWidth = 1200;
            const minScale = 0.65;
            const maxScale = 1.0;

            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));
            const t = (clampedWidth - minWidth) / (maxWidth - minWidth);
            setScale(minScale + t * (maxScale - minScale));
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Split and dodge state
    const splitAmount = useRef(0);
    const targetSplit = useRef(0);
    const floatY = useRef(0);
    // Pre-allocate Vector3 to avoid per-frame garbage collection
    const worldPosVec = useRef(new THREE.Vector3());

    // 标题逐字母：居中排布，分裂方向由中心向外发散（文字长度自适应）
    const letters = useMemo(() => {
        const chars = [...title];
        // 字母之间留一点空隙，避免手写体粘连（按字长自适应，长标题自动收紧）
        const spacing = Math.min(0.66, 2.7 / Math.max(chars.length, 1));
        const center = (chars.length - 1) / 2;
        return chars.map((char, i) => ({
            char,
            baseX: (i - center) * spacing,
            splitDir: (i - center) * 1.1,
            delay: 0,
        }));
    }, [title]);

    // 副标题按空白拆词：根据每个词的实际宽度动态排布，避免长词重叠
    const taglineWords = useMemo(() => {
        const words = tagline.split(/\s+/).filter(Boolean);
        if (words.length === 0) return [];

        // 估算字符宽度（与下面 Text 的 fontSize / letterSpacing 保持一致）
        const FONT_SIZE = 0.16;
        const LETTER_SPACING = 0.04;
        const AVG_CHAR_WIDTH_RATIO = 0.55; // 字符宽度 ≈ fontSize * 比例
        const WORD_PADDING = 0.05; // 词与词之间额外留白（缩小，避免 creative/developer 中间空隙过大）

        const widths = words.map(
            (text) => text.length * (FONT_SIZE * AVG_CHAR_WIDTH_RATIO + LETTER_SPACING)
        );

        // 从左到右累积，确定每个词的中心位置，最后整体居中
        const totalWidth =
            widths.reduce((a, b) => a + b, 0) + (words.length - 1) * WORD_PADDING;
        let cursor = -totalWidth / 2;
        const centers = widths.map((w) => {
            const center = cursor + w / 2;
            cursor += w + WORD_PADDING;
            return center;
        });

        return words.map((text, i) => ({
            text,
            baseX: centers[i],
            // 分裂方向按相对中心的归一化位置：左边向左、右边向右
            // 整体幅度调小，避免副标题中间（creative/developer）被推得太开
            splitDir: Math.sign(centers[i] || 1) * 0.3,
            delay: 0,
        }));
    }, [tagline]);

    // Animation loop
    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const time = state.clock.elapsedTime;

        // === SPLIT LOGIC based on camera distance ===
        groupRef.current.getWorldPosition(worldPosVec.current);
        const distance = camera.position.z - worldPosVec.current.z;

        const SPLIT_START = 3;
        const SPLIT_PEAK = 0;
        const SPLIT_END = -2;
        const SPLIT_AMOUNT = 0.9;

        if (distance > SPLIT_PEAK && distance < SPLIT_START) {
            const t = (SPLIT_START - distance) / (SPLIT_START - SPLIT_PEAK);
            targetSplit.current = SPLIT_AMOUNT * easeOutQuad(t);
        } else if (distance <= SPLIT_PEAK && distance > SPLIT_END) {
            const t = (distance - SPLIT_END) / (SPLIT_PEAK - SPLIT_END);
            targetSplit.current = SPLIT_AMOUNT * easeOutQuad(t);
        } else {
            targetSplit.current = 0;
        }

        splitAmount.current = THREE.MathUtils.lerp(splitAmount.current, targetSplit.current, 0.08);

        // Apply split to each letter of ITOM
        letterRefs.current.forEach((ref, i) => {
            if (ref) {
                // Ensure opacity is 1
                if (ref.material) ref.material.opacity = 1;
                ref.scale.setScalar(1); // Ensure scale is 1, no lingering pop effect

                const letter = letters[i];
                ref.position.x = letter.baseX + letter.splitDir * splitAmount.current;
                ref.position.y = 0.2 + Math.sin(time * 0.7 + i * 0.5) * 0.015;
                ref.rotation.z = Math.sin(time * 0.5 + i) * 0.02 * (1 + splitAmount.current);
            }
        });

        // Apply split to tagline words
        taglineRefs.current.forEach((ref, i) => {
            if (ref) {
                // Ensure opacity is 1
                if (ref.material) ref.material.opacity = 1;

                const word = taglineWords[i];
                // 副标题分裂幅度再做一次衰减，避免中间被拉得过开
                ref.position.x = word.baseX + word.splitDir * splitAmount.current * 0.3;
                ref.position.y = -0.45 + Math.sin(time * 0.6 + i * 0.3) * 0.008;
            }
        });

        // === FLOATING ANIMATION ===
        floatY.current = Math.sin(time * 0.5) * 0.02;
        // Don't override Y position entirely, add to base
        groupRef.current.position.y = position[1] + floatY.current;
    });

    return (
        <group ref={groupRef} position={position} scale={[scale, scale, 1]}>
            {/* ITOM Letters - Rubik Scribble font with fade-in animation */}
            {letters.map((letter, i) => (
                <Text
                    key={`${i}-${letter.char}`}
                    ref={(el) => (letterRefs.current[i] = el)}
                    position={[letter.baseX, 0.2, 0]}
                    fontSize={0.9}
                    font={fontForText(title)}
                    color="#ffffff"
                    outlineWidth={0.012}
                    outlineColor="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0}
                >
                    {letter.char}
                </Text>
            ))}

            {/* Tagline words - Cabin Sketch font with fade-in animation */}
            {taglineWords.map((word, i) => (
                <Text
                    key={`${i}-${word.text}`}
                    ref={(el) => (taglineRefs.current[i] = el)}
                    position={[word.baseX, -0.55, 0.3]}
                    fontSize={0.16}
                    font={fontForText(tagline)}
                    color="#555555"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.04}
                >
                    {word.text}
                </Text>
            ))}

            {/* Small decorative doodles around title */}
            <SmallStar position={[-1.2, 0.55, 0]} scale={0.07} />
            <SmallStar position={[1.25, 0.45, 0]} scale={0.05} />
            <SmallStar position={[-1.0, -0.6, 0]} scale={0.04} />
            <SmallStar position={[1.1, -0.55, 0]} scale={0.035} />
        </group>
    );
};

// Easing function
const easeOutQuad = (t) => t * (2 - t);

/**
 * Small decorative star - STATIC to avoid useFrame overhead
 * Parent HeroText already handles all animations
 */
const SmallStar = ({ position, scale = 0.1 }) => {
    return (
        <group position={position} scale={scale}>
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
                    <planeGeometry args={[1, 0.12]} />
                    <meshBasicMaterial color="#333" transparent opacity={0.6} side={2} />
                </mesh>
            ))}
        </group>
    );
};

export default HeroText;
