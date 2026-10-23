export const now = () => Date.now();
export const rid = () => crypto.randomUUID();
export const cos_sim = (a, b) => {
    let dot = 0,
        na = 0,
        nb = 0;
    for (let i = 0; i < a.length; i++) {
        const x = a[i],
            y = b[i];
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    const d = Math.sqrt(na) * Math.sqrt(nb);
    return d ? dot / d : 0;
};
export const j = JSON.stringify;
export const p = (x) => JSON.parse(x);
export const vec_to_buf = (v) => {
    const f32 = new Float32Array(v);
    return Buffer.from(f32.buffer);
};
export const buf_to_vec = (buf) => {
    return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
};
