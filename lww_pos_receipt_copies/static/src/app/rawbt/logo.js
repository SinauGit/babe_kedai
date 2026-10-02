const CANVAS_WIDTH = 384;
const LOGO_WIDTH = 192;
const BAND_HEIGHT = 128;
const THRESHOLD = 160;
const GS = 0x1d;

const cache = new Map();

export function rgbaToRasterBands(rgba, width, height) {
    const bytesPerRow = width / 8;
    const bits = new Uint8Array(bytesPerRow * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const luminance = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
            if (luminance < THRESHOLD) {
                bits[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
            }
        }
    }
    const parts = [];
    for (let y = 0; y < height; y += BAND_HEIGHT) {
        const h = Math.min(BAND_HEIGHT, height - y);
        parts.push(
            Uint8Array.from([GS, 0x76, 0x30, 0x00, bytesPerRow & 0xff, bytesPerRow >> 8, h & 0xff, h >> 8])
        );
        parts.push(bits.subarray(y * bytesPerRow, (y + h) * bytesPerRow));
    }
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const part of parts) {
        out.set(part, pos);
        pos += part.length;
    }
    return out;
}

async function loadLogoBytes(companyId) {
    const url = `/web/image?model=res.company&id=${companyId}&field=logo`;
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
        throw new Error("Logo tidak dapat diambil");
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    try {
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = objectUrl;
        });
        const height = Math.max(1, Math.round((img.naturalHeight * LOGO_WIDTH) / img.naturalWidth));
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_WIDTH;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_WIDTH, height);
        ctx.drawImage(img, (CANVAS_WIDTH - LOGO_WIDTH) / 2, 0, LOGO_WIDTH, height);
        const { data } = ctx.getImageData(0, 0, CANVAS_WIDTH, height);
        return rgbaToRasterBands(data, CANVAS_WIDTH, height);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export function getLogoBytes(companyId, timeoutMs = 1500) {
    if (!companyId) {
        return Promise.resolve(null);
    }
    if (!cache.has(companyId)) {
        cache.set(
            companyId,
            loadLogoBytes(companyId).catch(() => {
                cache.delete(companyId);
                return null;
            })
        );
    }
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
    return Promise.race([cache.get(companyId), timeout]);
}
