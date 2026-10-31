#!/usr/bin/env bash
# tools/video-automation/generate-cairo-plaza-reel.sh
# Automated 9:16 vertical video reel with Ken Burns effect for Cairo Plaza

ffmpeg -y \
  -loop 1 -t 4 -i "Cairo_Plaza_snapshot_04-13-2026_09_43_52.jpeg" \
  -loop 1 -t 4 -i "Cairo_Plaza_snapshot_04-13-2026_10_57_52.jpg" \
  -loop 1 -t 5 -i "WhatsApp Image 2026-04-13 at 08.19.50.jpeg" \
  -loop 1 -t 5 -i "project entrance from inside.jpg" \
  -loop 1 -t 4 -i "FB_IMG_1772182874521.jpg" \
  -loop 1 -t 4 -i "FB_IMG_1772182822198.jpg" \
  -loop 1 -t 4 -i "the front end tower.jpg" \
  -i "Cairo_Plaza_Arabic_VO.mp3" \
  -filter_complex \
  "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=120:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[v0]; \
   [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=120:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[v1]; \
   [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[v2]; \
   [3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[v3]; \
   [4:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=120:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[v4]; \
   [5:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=120:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[v5]; \
   [6:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.15)':d=120:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920[v6]; \
   [v0][v1][v2][v3][v4][v5][v6]concat=n=7:v=1:a=0[outv]" \
  -map "[outv]" -map 7:a -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest cairo_plaza_final_overview.mp4
