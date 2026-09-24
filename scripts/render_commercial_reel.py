import subprocess
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

FFMPEG = r"C:\Users\Sierr\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-N-125875-g5d4d3bdc61-win64-gpl\bin\ffmpeg.exe"

FB_VIDEO = r"C:\Users\Sierr\.gemini\antigravity-ide\brain\5161730a-7822-48db-9571-44c17b03b588\scratch\fb_cairo_plaza.mp4"
FB_AUDIO = r"C:\Users\Sierr\.gemini\antigravity-ide\brain\5161730a-7822-48db-9571-44c17b03b588\scratch\fb_audio.aac"
SITE_VIDEO = r"F:\Cairo plaza project\Cairo plaza\مطريه بلازا\Real\video_20260328_153228.mp4"

OFFICE_PHOTO = r"H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\cairo-plaza\site-photos\cp-furnished-executive-office-bright.jpg"
MARBLE_PHOTO = r"H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\cairo-plaza\site-photos\cp-interior-marble-stairs-bright.jpg"
PORTAL_PHOTO = r"H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\cairo-plaza\site-photos\cp-portal-tower1-entrance-bright.jpg"

OVERLAYS_DIR = r"H:\last\Main\SE-Vercel-deploy-main\scratch\video_overlays"
TMP_DIR = r"H:\last\Main\SE-Vercel-deploy-main\scratch\reel_parts"
os.makedirs(TMP_DIR, exist_ok=True)

OUT_PUBLIC = r"H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\cairo-plaza\cairo-plaza-commercial-reel-2026.mp4"
OUT_PUBLIC_DOCS = r"H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\cairo-plaza\videos\cairo-plaza-commercial-reel-2026.mp4"
OUT_F_DRIVE = r"F:\Cairo plaza project\cairo-plaza-commercial-reel-2026.mp4"

os.makedirs(os.path.dirname(OUT_PUBLIC_DOCS), exist_ok=True)

DURATION = 6.5
FPS = 30
W = 1080
H = 1920

def run_ffmpeg(cmd, desc):
    print(f"--> {desc}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error in {desc}:")
        print(res.stderr[-800:])
        raise RuntimeError(f"FFmpeg failed: {desc}")
    print(f"[OK] {desc} completed successfully.")

# ── Scene 1: Metro Arrival ──────────────────────────────────────────
s1_out = os.path.join(TMP_DIR, "part1.mp4")
s1_overlay = os.path.join(OVERLAYS_DIR, "scene1_metro.png")
if not (os.path.exists(s1_out) and os.path.getsize(s1_out) > 500000):
    cmd1 = [
        FFMPEG, "-y",
        "-ss", "00:00:04.5", "-t", str(DURATION),
        "-i", FB_VIDEO,
        "-loop", "1", "-i", s1_overlay,
        "-filter_complex",
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:5[bg];"
        "[0:v]scale=1080:-1[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2-140[comp];"
        "[comp][1:v]overlay=0:0:shortest=1[outv]",
        "-map", "[outv]",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
        s1_out
    ]
    run_ffmpeg(cmd1, "Rendering Scene 1 (Metro Arrival)")
else:
    print("[OK] Scene 1 already cached.")

# ── Scene 2: Architectural Complex Flyover ───────────────────────────
s2_out = os.path.join(TMP_DIR, "part2.mp4")
s2_overlay = os.path.join(OVERLAYS_DIR, "scene2_towers.png")
if not (os.path.exists(s2_out) and os.path.getsize(s2_out) > 500000):
    cmd2 = [
        FFMPEG, "-y",
        "-ss", "00:00:48.0", "-t", str(DURATION),
        "-i", FB_VIDEO,
        "-loop", "1", "-i", s2_overlay,
        "-filter_complex",
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:5[bg];"
        "[0:v]scale=1080:-1[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2-140[comp];"
        "[comp][1:v]overlay=0:0:shortest=1[outv]",
        "-map", "[outv]",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
        s2_out
    ]
    run_ffmpeg(cmd2, "Rendering Scene 2 (3D Architectural Towers)")
else:
    print("[OK] Scene 2 already cached.")

# ── Scene 3: Real Street Frontage & Banque Misr ──────────────────────
s3_out = os.path.join(TMP_DIR, "part3.mp4")
s3_overlay = os.path.join(OVERLAYS_DIR, "scene3_real_site.png")
if not (os.path.exists(s3_out) and os.path.getsize(s3_out) > 500000):
    cmd3 = [
        FFMPEG, "-y",
        "-ss", "00:00:04.0", "-t", str(DURATION),
        "-i", SITE_VIDEO,
        "-loop", "1", "-i", s3_overlay,
        "-filter_complex",
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:5[bg];"
        "[0:v]scale=1080:-1[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2-140[comp];"
        "[comp][1:v]overlay=0:0:shortest=1[outv]",
        "-map", "[outv]",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
        s3_out
    ]
    run_ffmpeg(cmd3, "Rendering Scene 3 (Real Site & Banque Misr)")
else:
    print("[OK] Scene 3 already cached.")

# ── Scene 4: Marble Hotel-Grade Entrance ─────────────────────────────
s4_out = os.path.join(TMP_DIR, "part4.mp4")
s4_overlay = os.path.join(OVERLAYS_DIR, "scene4_marble.png")
cmd4 = [
    FFMPEG, "-y",
    "-loop", "1", "-framerate", str(FPS), "-t", str(DURATION), "-i", MARBLE_PHOTO,
    "-loop", "1", "-framerate", str(FPS), "-t", str(DURATION), "-i", s4_overlay,
    "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[photo];"
    "[photo][1:v]overlay=0:0:shortest=1[outv]",
    "-map", "[outv]",
    "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
    s4_out
]
run_ffmpeg(cmd4, "Rendering Scene 4 (Marble Stairs & Entrance)")

# ── Scene 5: Fully Furnished Executive Office ────────────────────────
s5_out = os.path.join(TMP_DIR, "part5.mp4")
s5_overlay = os.path.join(OVERLAYS_DIR, "scene5_office.png")
cmd5 = [
    FFMPEG, "-y",
    "-loop", "1", "-framerate", str(FPS), "-t", str(DURATION), "-i", OFFICE_PHOTO,
    "-loop", "1", "-framerate", str(FPS), "-t", str(DURATION), "-i", s5_overlay,
    "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=26:5[bg];"
    "[0:v]scale=1020:-1[fg];"
    "[bg][fg]overlay=(W-w)/2:(H-h)/2-140[comp];"
    "[comp][1:v]overlay=0:0:shortest=1[outv]",
    "-map", "[outv]",
    "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
    s5_out
]
run_ffmpeg(cmd5, "Rendering Scene 5 (Turnkey Executive Office)")

# ── Scene 6: Verified Pricing Matrix ─────────────────────────────────
s6_out = os.path.join(TMP_DIR, "part6.mp4")
s6_overlay = os.path.join(OVERLAYS_DIR, "scene6_pricing.png")
cmd6 = [
    FFMPEG, "-y",
    "-ss", "00:00:25.0", "-t", str(DURATION),
    "-i", FB_VIDEO,
    "-loop", "1", "-i", s6_overlay,
    "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.25:contrast=1.1,boxblur=8:2[bg];"
    "[bg][1:v]overlay=0:0:shortest=1[outv]",
    "-map", "[outv]",
    "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
    s6_out
]
run_ffmpeg(cmd6, "Rendering Scene 6 (Pricing & Space Opportunities)")

# ── Scene 7: Official Call To Action & Closer ────────────────────────
s7_out = os.path.join(TMP_DIR, "part7.mp4")
s7_overlay = os.path.join(OVERLAYS_DIR, "scene7_cta.png")
cmd7 = [
    FFMPEG, "-y",
    "-loop", "1", "-framerate", str(FPS), "-t", str(DURATION), "-i", PORTAL_PHOTO,
    "-loop", "1", "-framerate", str(FPS), "-t", str(DURATION), "-i", s7_overlay,
    "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.35:contrast=1.2,boxblur=12:3[bg];"
    "[bg][1:v]overlay=0:0:shortest=1[outv]",
    "-map", "[outv]",
    "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
    s7_out
]
run_ffmpeg(cmd7, "Rendering Scene 7 (Official Closer & CTA)")

# ── Concatenate All 7 Scenes with Soundtrack ──────────────────────────
TOTAL_TIME = DURATION * 7 # 45.5s
concat_txt = os.path.join(TMP_DIR, "concat.txt")
with open(concat_txt, "w") as f:
    for i in range(1, 8):
        part_name = f"part{i}.mp4"
        f.write(f"file '{part_name}'\n")

print(f"Total Video Length: {TOTAL_TIME} seconds. Merging video parts and adding audio...")

# Concatenate and mux with the audio track + smooth fade out
final_temp = os.path.join(TMP_DIR, "final_assembled.mp4")
cmd_concat = [
    FFMPEG, "-y",
    "-f", "concat", "-safe", "0", "-i", concat_txt,
    "-ss", "00:00:03.0", "-t", str(TOTAL_TIME), "-i", FB_AUDIO,
    "-filter_complex",
    f"[1:a]afade=t=out:st={TOTAL_TIME - 2.5}:d=2.5[aout]",
    "-map", "0:v", "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k",
    final_temp
]
run_ffmpeg(cmd_concat, "Concatenating All Scenes with Audio Track")

# Copy final video to all destination locations
import shutil
shutil.copyfile(final_temp, OUT_PUBLIC)
shutil.copyfile(final_temp, OUT_PUBLIC_DOCS)
try:
    shutil.copyfile(final_temp, OUT_F_DRIVE)
    print(f"[OK] Copied final video to F: drive: {OUT_F_DRIVE}")
except Exception as e:
    print("Warning copying to F: drive:", e)

file_size_mb = os.path.getsize(OUT_PUBLIC) / (1024 * 1024)
print(f"[SUCCESS] Commercial Video Reel (9:16 Vertical) is ready!")
print(f"Size: {file_size_mb:.2f} MB | Duration: {TOTAL_TIME}s")
print(f"Local Path 1: {OUT_PUBLIC}")
print(f"Local Path 2: {OUT_F_DRIVE}")
