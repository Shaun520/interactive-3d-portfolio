import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useScene } from '../../context/SceneContext';
import { useAudio } from '../../context/AudioManager';
import { setMusicVolume, getMusicVolume } from '../../utils/audioManager';
import { useAchievements } from '../../context/AchievementsContext';
import { useRooms, useTheme } from '../../context/SiteConfigContext';
import AchievementPopup from './AchievementPopup';
import AchievementsPanel from './AchievementsPanel';
import '../../styles/NavigationUI.scss';

// Pin starting position - the dashed circle at the bottom of the tower
const PIN_START_POSITION = { x: 50.5, y: 97 };

// 从 polygon(...) 提取最后一个点生成「折叠」clipPath（hover 离开时收起高亮）
const collapseClipPath = (clip) => {
    const match = clip.match(/polygon\(([^)]+)\)/);
    if (!match) return clip;
    const pts = match[1].split(',').map(s => s.trim());
    if (pts.length < 1) return clip;
    const [x, y] = pts[pts.length - 1].split(/\s+/);
    return `polygon(${pts.map(() => `${x} ${y}`).join(', ')})`;
};

// 地图标签文字：优先 map.label，缺省用 label（自动换行：含 \n 按 \n，否则按空格）
const mapLabelLines = (room) => {
    const raw = room.map?.label || room.label || room.shortLabel || '';
    return raw.includes('\n') ? raw.split('\n') : raw.split(' ').filter(Boolean);
};

const NavigationUI = () => {
    const { currentRoom, isInRoom, requestExit, hasEntered, teleportTo, isTeleporting } = useScene();
    const { isMuted, toggleMute, globalVolume, setGlobalVolume } = useAudio();
    const { showTutorial, unlockAchievement } = useAchievements();
    // 房间与主题均来自统一配置
    const rooms = useRooms();
    const theme = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hoveredRoom, setHoveredRoom] = useState(null);
    const [isExiting, setIsExiting] = useState(false); // Track when back button is clicked

    // Audio controls state
    const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
    const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
    const [bgmVol, setBgmVol] = useState(0.3);
    const [isUIHidden, setIsUIHidden] = useState(false);

    // Refs for focus management
    const mapPanelRef = useRef();
    const mapCloseRef = useRef();

    useEffect(() => {
        const handleInspectChange = (e) => {
            setIsUIHidden(e.detail);
            if (e.detail) {
                setIsMenuOpen(false);
                setIsAudioMenuOpen(false);
                setIsAchievementsOpen(false);
            }
        };
        window.addEventListener('inspectChange', handleInspectChange);
        return () => window.removeEventListener('inspectChange', handleInspectChange);
    }, []);

    // 动态 painted 层 ref 集合（按 room.id 存取）
    const paintedMapsRefs = useRef({});

    // clipPath 高亮动画：遍历所有房间，hover/当前房间展开、离开收起
    useEffect(() => {
        rooms.forEach((room) => {
            const el = paintedMapsRefs.current[room.id];
            if (el && room.map?.clipPath) {
                gsap.to(el, {
                    clipPath: (hoveredRoom === room.id || currentRoom === room.id)
                        ? room.map.clipPath
                        : collapseClipPath(room.map.clipPath),
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        });
    }, [hoveredRoom, currentRoom, rooms]);

    useEffect(() => {
        setBgmVol(getMusicVolume());

        const handleMusicVolumeChange = (e) => {
            setBgmVol(e.detail);
        };
        window.addEventListener('musicVolumeChanged', handleMusicVolumeChange);

        return () => window.removeEventListener('musicVolumeChanged', handleMusicVolumeChange);
    }, []);

    const handleBgmChange = (val) => {
        setBgmVol(val);
        setMusicVolume(val);
    };

    // Show entrance hint before entering, and explore hint when user enters
    useEffect(() => {
        if (!hasEntered && !isTeleporting) {
            showTutorial('corridor_enter');
        } else if (hasEntered && !isTeleporting && !isInRoom) {
            showTutorial('corridor_explore');
        }
    }, [hasEntered, isTeleporting, isInRoom, showTutorial]);

    // Close menu when entering a room or starting teleport
    useEffect(() => {
        if (isInRoom || isTeleporting) {
            setIsMenuOpen(false);
            setIsAudioMenuOpen(false);
            setIsAchievementsOpen(false);
            setIsExiting(false);
        }
    }, [isInRoom, isTeleporting]);

    // Reset exiting state when not in room anymore
    useEffect(() => {
        if (!isInRoom) {
            setIsExiting(false);
        }
    }, [isInRoom]);

    // A4: Focus management for map panel — auto-focus, Escape, and focus trap
    useEffect(() => {
        if (isMenuOpen) {
            // Auto-focus on close button when map opens
            setTimeout(() => mapCloseRef.current?.focus(), 100);
        }
    }, [isMenuOpen]);

    // Global Escape key handler — closes any open panel
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (isMenuOpen) setIsMenuOpen(false);
                if (isAudioMenuOpen) setIsAudioMenuOpen(false);
                if (isAchievementsOpen) setIsAchievementsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen, isAudioMenuOpen, isAchievementsOpen]);

    // Focus trap handler for map panel
    const handleMapKeyDown = (e) => {
        if (e.key !== 'Tab' || !mapPanelRef.current) return;

        const focusable = mapPanelRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            // Shift+Tab on first element → wrap to last
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            // Tab on last element → wrap to first
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    const handleRoomClick = (roomId) => {
        // Don't teleport to the same room or if already teleporting
        if (roomId === currentRoom || isTeleporting) return;

        // Close map first, then start teleport
        setIsMenuOpen(false);
        setIsAudioMenuOpen(false);
        setIsAchievementsOpen(false);
        teleportTo(roomId);
    };

    const handleBackClick = () => {
        setIsExiting(true); // Immediately start exit animation
        // Request exit - DoorSection will handle the animation
        requestExit();
    };

    return (
        <div className="navigation-ui">
            {/* Global Achievement Popup */}
            <AchievementPopup />

            {/* Back Button - Only visible in rooms, hides up when clicked */}
            {hasEntered && isInRoom && (
                <button
                    className={`nav-btn back-btn ${isExiting ? 'exiting' : ''}`}
                    onClick={handleBackClick}
                    aria-label="Back to corridor"
                >
                    <svg viewBox="0 0 24 24" className="icon-back">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {/* Right side controls - Only visible after entering */}
            {hasEntered && (
                <div className={`nav-controls ${isMenuOpen || isAudioMenuOpen ? 'menu-open' : ''} ${isUIHidden ? 'ui-hidden' : ''}`}>
                    {/* Hamburger Menu Button */}
                    <button
                        className={`nav-btn hamburger-btn ${isMenuOpen ? 'open' : ''}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        <div className="hamburger-icon">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </button>
                    {/* Audio Toggle Button */}
                    <button
                        className={`nav-btn audio-btn ${isAudioMenuOpen ? 'open' : ''}`}
                        onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
                        aria-label="Audio Settings"
                        aria-expanded={isAudioMenuOpen}
                    >
                        {isMuted ? (
                            <svg viewBox="0 0 24 24" className="icon-audio">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" className="icon-audio">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <path d="M15 9a5 5 0 0 1 0 6" />
                                <path d="M18 5a9 9 0 0 1 0 14" />
                            </svg>
                        )}
                    </button>
                    {/* Achievements Toggle Button */}
                    <button
                        className={`nav-btn achievements-btn ${isAchievementsOpen ? 'open' : ''}`}
                        onClick={() => setIsAchievementsOpen(!isAchievementsOpen)}
                        aria-label="Achievements"
                        aria-expanded={isAchievementsOpen}
                    >
                        <svg viewBox="0 0 24 24" className="icon-trophy">
                            <path d="M8 21h8M12 17v4M7 4h10M5 4h14v5a7 7 0 0 1-7 7 7 7 0 0 1-7-7z" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 9H3V6h2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 9h2V6h-2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Map Panel - Drops from top when open */}
            {hasEntered && (
                <div className={`map-panel ${isMenuOpen ? 'open' : ''}`} inert={!isMenuOpen ? true : undefined} ref={mapPanelRef} onKeyDown={handleMapKeyDown} role="dialog" aria-label="Map">
                    {/* SVG Border Overlay */}
                    <svg
                        className="map-border-overlay"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 10
                        }}
                    >
                        <path
                            d="M 0 0 L 100 0 L 100 0 L 99 3 L 100 6 L 98 10 L 100 14 L 99 18 L 100 22 L 98 26 L 100 30 L 99 35 L 100 40 L 98 45 L 100 50 L 99 55 L 100 60 L 98 65 L 100 70 L 99 75 L 100 80 L 98 85 L 100 90 L 99 95 L 100 100 L 96 99 L 92 100 L 88 98 L 84 100 L 80 99 L 76 100 L 72 98 L 68 100 L 64 99 L 60 100 L 56 98 L 52 100 L 48 99 L 44 100 L 40 98 L 36 100 L 32 99 L 28 100 L 24 98 L 20 100 L 16 99 L 12 100 L 8 98 L 4 100 L 0 99 L 0.5 99.5 L 1 95 L 0 90 L 2 85 L 0 80 L 1 75 L 0 70 L 2 65 L 0 60 L 1 55 L 0 50 L 2 45 L 0 40 L 1 35 L 0 30 L 2 26 L 0 22 L 1 18 L 0 14 L 2 10 L 0 6 L 1 3 L 0 0 Z"
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>

                    <div className="map-content-clipped">
                        <div className="map-header">
                            <h3>MAP</h3>
                            <button
                                ref={mapCloseRef}
                                className="close-btn"
                                onClick={() => setIsMenuOpen(false)}
                                aria-label="Close map"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="map-container" style={{ aspectRatio: '100 / 95.5' }}>
                            {/* Map background image (from theme.assets.map) */}
                            <img src={theme.assets.map} alt="Portfolio Map" className="map-image" style={{ height: '100%' }} />

                            {/* Painted Map Overlays - one per room with a painted image */}
                            {rooms.map((room) => room.map?.paintedImage ? (
                                <img
                                    key={`painted-${room.id}`}
                                    ref={(el) => { paintedMapsRefs.current[room.id] = el; }}
                                    src={room.map.paintedImage}
                                    alt=""
                                    className="painted-map-layer"
                                    style={{ top: 'auto', bottom: 0, height: '100%', clipPath: collapseClipPath(room.map.clipPath) }}
                                />
                            ) : null)}

                            {/* Hover Zones - one per configured room (centered on map.x/y) */}
                            {rooms.map((room) => (
                                <button
                                    key={`zone-${room.id}`}
                                    type="button"
                                    className="map-hover-zone"
                                    style={{
                                        left: `${room.map?.x ?? 50}%`,
                                        top: `${room.map?.y ?? 50}%`,
                                        width: '26%',
                                        height: '26%',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    onMouseEnter={() => setHoveredRoom(room.id)}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                    onFocus={() => setHoveredRoom(room.id)}
                                    onBlur={() => setHoveredRoom(null)}
                                    onClick={() => handleRoomClick(room.id)}
                                    aria-label={`Teleport to ${room.shortLabel || room.label} room`}
                                />
                            ))}

                            {/* Permanent Map Text Labels */}
                            {rooms.map((room) => (
                                <div
                                    key={`label-${room.id}`}
                                    className="map-room-label"
                                    style={{
                                        left: `${room.map?.labelPos?.x ?? room.map?.x ?? 50}%`,
                                        top: `${room.map?.labelPos?.y ?? room.map?.y ?? 50}%`
                                    }}
                                >
                                    {mapLabelLines(room).map((line, i, arr) => (
                                        <span key={i}>{line}{i < arr.length - 1 ? <br /> : null}</span>
                                    ))}
                                </div>
                            ))}

                            {/* Pin slot markers - one per configured room */}
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    className={`pin-slot ${currentRoom === room.id ? 'active' : ''} ${hoveredRoom === room.id ? 'hovered' : ''}`}
                                    style={{ left: `${room.map?.x ?? 50}%`, top: `${room.map?.y ?? 50}%` }}
                                    onClick={() => handleRoomClick(room.id)}
                                    onMouseEnter={() => setHoveredRoom(room.id)}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                    title={room.shortLabel || room.label}
                                >
                                    <img src={theme.assets.pinSlot} alt="" className="slot-image" />
                                </button>
                            ))}

                            {/* The pin marker - moves to hovered slot, or current room, or start position */}
                            <div
                                className="pin-marker"
                                style={{
                                    left: `${hoveredRoom
                                        ? rooms.find(r => r.id === hoveredRoom)?.map?.x || PIN_START_POSITION.x
                                        : currentRoom && isInRoom
                                            ? rooms.find(r => r.id === currentRoom)?.map?.x || PIN_START_POSITION.x
                                            : PIN_START_POSITION.x
                                        }%`,
                                    top: `${hoveredRoom
                                        ? rooms.find(r => r.id === hoveredRoom)?.map?.y || PIN_START_POSITION.y
                                        : currentRoom && isInRoom
                                            ? rooms.find(r => r.id === currentRoom)?.map?.y || PIN_START_POSITION.y
                                            : PIN_START_POSITION.y
                                        }%`
                                }}
                            >
                                <img src={theme.assets.pin} alt="You are here" className="pin-image" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Audio Panel — drops down from the button */}
            {hasEntered && (
                <div className={`audio-panel ${isAudioMenuOpen ? 'open' : ''}`} inert={!isAudioMenuOpen ? true : undefined}>
                    <div className="audio-card">
                        <div className="audio-header">
                            <h3>AUDIO SETTINGS</h3>
                            <button
                                className="close-btn"
                                onClick={() => setIsAudioMenuOpen(false)}
                                aria-label="Close audio settings"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="audio-sliders-container">
                            <div className="slider-group">
                                <div className="slider-label">
                                    <span>Music</span>
                                    <span>{Math.round(bgmVol * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={bgmVol}
                                    onChange={(e) => handleBgmChange(parseFloat(e.target.value))}
                                    className="paper-slider"
                                    aria-label="Music volume"
                                    aria-valuetext={`${Math.round(bgmVol * 100)} percent`}
                                />
                            </div>
                            <div className="slider-group">
                                <div className="slider-label">
                                    <span>SFX</span>
                                    <span>{Math.round(globalVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={globalVolume}
                                    onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
                                    className="paper-slider"
                                    aria-label="SFX volume"
                                    aria-valuetext={`${Math.round(globalVolume * 100)} percent`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements Panel */}
            <AchievementsPanel
                isOpen={isAchievementsOpen}
                onClose={() => setIsAchievementsOpen(false)}
            />

            {/* Overlay to close menus */}
            {(isMenuOpen || isAudioMenuOpen || isAchievementsOpen) && (
                <div
                    className="menu-overlay"
                    onClick={() => {
                        setIsMenuOpen(false);
                        setIsAudioMenuOpen(false);
                        setIsAchievementsOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default NavigationUI;
