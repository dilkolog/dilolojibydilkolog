#!/usr/bin/env python3
"""
Slices a 2x2 or 1x4 sprite sheet into individual animation frames,
removes exterior background via corner floodfill, and compiles into an Animated WebP.
"""
import sys
import os
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

def extract_alpha_floodfill(im, tolerance=20):
    """Flood-fills from borders/corners to find external background and sets alpha."""
    rgba = im.convert('RGBA')
    w, h = rgba.size
    data = np.array(rgba)
    rgb = data[:, :, :3].astype(np.int32)
    
    # Corner color reference
    corners = [rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]]
    bg_color = np.median(corners, axis=0)
    
    # Distance to bg_color
    dist = np.linalg.norm(rgb - bg_color, axis=2)
    is_bg = dist <= tolerance
    
    # BFS floodfill from edges
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    # Add borders to queue if they match bg
    for x in range(w):
        if is_bg[0, x]: queue.append((0, x)); visited[0, x] = True
        if is_bg[h - 1, x]: queue.append((h - 1, x)); visited[h - 1, x] = True
    for y in range(h):
        if is_bg[y, 0] and not visited[y, 0]: queue.append((y, 0)); visited[y, 0] = True
        if is_bg[y, w - 1] and not visited[y, w - 1]: queue.append((y, w - 1)); visited[y, w - 1] = True
        
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_bg[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                elif dist[ny, nx] <= tolerance + 15: # soft edge
                    visited[ny, nx] = True
                    # Fade alpha slightly on fringe
                    data[ny, nx, 3] = int(255 * ((dist[ny, nx] - tolerance) / 15.0))
    
    data[visited & (dist <= tolerance), 3] = 0
    return Image.fromarray(data, 'RGBA')

def compile_animated_webp(input_path, output_path, rows=2, cols=2, duration_ms=180):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} does not exist", file=sys.stderr)
        return False
        
    sheet = Image.open(input_path)
    sw, sh = sheet.size
    fw = sw // cols
    fh = sh // rows
    
    frames = []
    for r in range(rows):
        for c in range(cols):
            box = (c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)
            frame = sheet.crop(box)
            # Remove padding / background
            frame_rgba = extract_alpha_floodfill(frame)
            # Trim bounding box
            bbox = frame_rgba.getbbox()
            if bbox:
                # Add 4px breathing room
                bx0 = max(0, bbox[0] - 4)
                by0 = max(0, bbox[1] - 4)
                bx1 = min(fw, bbox[2] + 4)
                by1 = min(fh, bbox[3] + 4)
                trimmed = frame_rgba.crop((bx0, by0, bx1, by1))
            else:
                trimmed = frame_rgba
                
            # Resize to normalized avatar size: 192x192
            trimmed.thumbnail((192, 192), Image.Resampling.LANCZOS)
            
            # Place on centered 192x192 canvas so motion is stable
            canvas = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
            tw, th = trimmed.size
            canvas.paste(trimmed, ((192 - tw) // 2, (192 - th) // 2), trimmed)
            frames.append(canvas)
            
    if not frames:
        return False
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        optimize=True,
        format='WEBP'
    )
    print(f"Successfully compiled {len(frames)} frames into {output_path} ({os.path.getsize(output_path)} bytes)")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: build_mascot_animations.py <input_sheet> <output_webp> [rows] [cols] [duration_ms]")
        sys.exit(1)
    compile_animated_webp(
        sys.argv[1],
        sys.argv[2],
        rows=int(sys.argv[3]) if len(sys.argv) > 3 else 2,
        cols=int(sys.argv[4]) if len(sys.argv) > 4 else 2,
        duration_ms=int(sys.argv[5]) if len(sys.argv) > 5 else 180,
    )
