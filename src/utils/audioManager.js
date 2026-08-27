/**
 * Simple Global Audio Manager for background music
 */

let bgMusicAudio = null;
let isMuted = false;
let bgMusicStarted = false;
// 当前背景音乐源（默认项目自带；屋外编辑器可换）
let bgMusicUrl = '/sounds/cfl_turningpages-belem-breeze-487596.ogg';

// Initialize background music
export const initAudio = (url) => {
    if (typeof window === 'undefined') return;

    // Sync muted state from localStorage (same key as AudioManager context)
    const savedMuted = localStorage.getItem('audio_muted');
    isMuted = savedMuted === 'true';

    // 音乐源变化：仅当还没开始播放时重建（播放中则保留，避免中断当前音乐）
    if (url && url !== bgMusicUrl && !bgMusicStarted) {
        if (bgMusicAudio) {
            bgMusicAudio.pause();
            bgMusicAudio = null;
        }
        bgMusicUrl = url;
    }

    if (!bgMusicAudio) {
        // We use the file provided by the user in public/sounds/
        bgMusicAudio = new Audio(bgMusicUrl);
        bgMusicAudio.preload = 'auto'; // Force browser to fetch data immediately
        bgMusicAudio.loop = true;
        bgMusicAudio.volume = 0.3; // Default volume for background cozy music
        bgMusicAudio.muted = isMuted; // Apply synced mute state

        // Trigger background load
        bgMusicAudio.load();
    }
};

export const playBackgroundMusic = (url) => {
    // 未开始播放时允许直接切换到新音乐源再播放
    if (url && url !== bgMusicUrl && !bgMusicStarted) {
        if (bgMusicAudio) {
            bgMusicAudio.pause();
            bgMusicAudio = null;
        }
        bgMusicUrl = url;
    }
    initAudio();
    bgMusicStarted = true;
    if (bgMusicAudio && bgMusicAudio.paused) {
        // Only play if not muted and it's currently paused
        bgMusicAudio.play().catch((err) => {
            console.warn('Audio play failed/blocked by browser:', err);
        });
    }
};

export const pauseBackgroundMusic = () => {
    if (bgMusicAudio && !bgMusicAudio.paused) {
        bgMusicAudio.pause();
    }
};

export const toggleMute = () => {
    isMuted = !isMuted;
    if (bgMusicAudio) {
        bgMusicAudio.muted = isMuted;
    }
    return isMuted;
};

export const getIsMuted = () => isMuted;

export const setMusicVolume = (vol) => {
    if (bgMusicAudio) {
        bgMusicAudio.volume = Math.max(0, Math.min(1, vol));
        // Auto-unmute if user drags slider up
        if (vol > 0 && isMuted) {
            isMuted = false;
            bgMusicAudio.muted = false;
        }

        // Ensure playback continues if we unmute, ONLY if the music has actually been requested to start
        if (vol > 0 && bgMusicAudio.paused && bgMusicStarted) {
            bgMusicAudio.play().catch(e => console.warn(e));
        }
    }
    // Dispatch event so UI sliders can stay in sync if changed programmatically
    window.dispatchEvent(new CustomEvent('musicVolumeChanged', { detail: vol }));
};

export const getMusicVolume = () => {
    return bgMusicAudio ? bgMusicAudio.volume : 0.3;
};
