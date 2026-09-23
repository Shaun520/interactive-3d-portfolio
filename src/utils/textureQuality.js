/**
 * textureQuality.js — 全局纹理采样质量优化（方案 D）
 *
 * 所有场景贴图统一启用各向异性过滤（anisotropy），解决
 * 走廊墙/地板/门框等大角度斜视平面在手机上模糊的问题。
 *
 * 实现方式：对 THREE.TextureLoader.prototype.load 打一次性补丁，
 * 使项目里所有 useTexture / useLoader(TextureLoader) 加载的纹理
 * 在缓存回调时自动设置 anisotropy，无需逐文件修改。
 *
 * 注意：只改 anisotropy，不动 colorSpace —— 避免误伤法线 / 粗糙度
 * 等数据贴图的色彩空间。
 */
import * as THREE from 'three';

// 各向异性上限：所有主流平台的 clamp 值，实际取 GPU 支持上限
const MAX_ANISO_CAP = 8;

let gMaxAnisotropy = 4;

/** 在 Canvas onCreated 时同步真实 GPU 上限 */
export function setGpuMaxAnisotropy(gl) {
    if (gl && typeof gl.capabilities.getMaxAnisotropy === 'function') {
        gMaxAnisotropy = Math.min(MAX_ANISO_CAP, gl.capabilities.getMaxAnisotropy());
    }
}

const originalLoad = THREE.TextureLoader.prototype.load;

// 只打一次补丁，避免 HMR 重复包装
if (!originalLoad.__anisoPatched) {
    const patched = function (url, onLoad, onProgress, onError) {
        return originalLoad.call(this, url, (texture) => {
            if (texture) {
                texture.anisotropy = gMaxAnisotropy;
            }
            if (typeof onLoad === 'function') onLoad(texture);
        }, onProgress, onError);
    };
    patched.__anisoPatched = true;
    THREE.TextureLoader.prototype.load = patched;
}