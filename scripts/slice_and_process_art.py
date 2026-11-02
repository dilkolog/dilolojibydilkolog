import os
import sys
import numpy as np
from PIL import Image

def clean_white_and_crop(cell, target_size=200, th_low=235, th_high=252):
    """
    Takes a PIL Image cell, removes white background smoothly with alpha blending,
    crops to bounding box of content, and scales to target_size retaining aspect ratio.
    """
    rgb = np.array(cell.convert('RGB'), dtype=np.float32)
    min_c = np.min(rgb, axis=2)
    
    # Smooth alpha ramp for anti-aliased edges
    alpha = np.clip((th_high - min_c) / (th_high - th_low), 0, 1) * 255.0
    alpha = alpha.astype(np.uint8)
    
    rgba = np.dstack((np.array(cell.convert('RGB')), alpha))
    
    # Content bounding box based on visible alpha
    y_idx, x_idx = np.where(alpha > 18)
    if len(y_idx) > 0 and len(x_idx) > 0:
        pad = 8
        min_x = max(0, int(x_idx.min()) - pad)
        max_x = min(cell.width, int(x_idx.max()) + pad)
        min_y = max(0, int(y_idx.min()) - pad)
        max_y = min(cell.height, int(y_idx.max()) + pad)
        rgba = rgba[min_y:max_y, min_x:max_x]
    
    out = Image.fromarray(rgba, 'RGBA')
    w, h = out.size
    if w == 0 or h == 0:
        return out
        
    aspect = w / h
    if aspect >= 1:
        target_w = target_size
        target_h = max(1, int(round(target_size / aspect)))
    else:
        target_h = target_size
        target_w = max(1, int(round(target_size * aspect)))
        
    return out.resize((target_w, target_h), Image.Resampling.LANCZOS)

def slice_grid(image_path, grid_layout, out_dir='src/assets/art', target_size=200):
    """
    image_path: Path to the generated sheet
    grid_layout: List of lists with item names, e.g.
      [['item1', 'item2', 'item3'],
       ['item4', 'item5', 'item6']]
    """
    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(image_path)
    W, H = img.size
    rows = len(grid_layout)
    cols = max(len(r) for r in grid_layout)
    
    cell_w = W // cols
    cell_h = H // rows
    
    saved_files = []
    for r in range(rows):
        for c in range(len(grid_layout[r])):
            name = grid_layout[r][c]
            if not name:
                continue
            box = (c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h)
            cell = img.crop(box)
            processed = clean_white_and_crop(cell, target_size=target_size)
            target_path = os.path.join(out_dir, f'{name}.webp')
            processed.save(target_path, 'WEBP', quality=95)
            print(f'Saved: {target_path} ({processed.size[0]}x{processed.size[1]})')
            saved_files.append(target_path)
            
    return saved_files

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 slice-and-process-art.py <image_path> <layout_type>")
        sys.exit(1)
