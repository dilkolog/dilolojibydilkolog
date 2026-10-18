import os
import numpy as np
from PIL import Image

def clean_white(cell, th_low=240, th_high=252):
    rgb = np.array(cell, dtype=np.float32)
    min_c = np.min(rgb, axis=2)
    alpha = np.clip((th_high - min_c) / (th_high - th_low), 0, 1) * 255
    alpha = alpha.astype(np.uint8)
    
    rgba = np.dstack((np.array(cell), alpha))
    
    # Bounding box of content
    y_idx, x_idx = np.where(alpha > 20)
    if len(y_idx) > 0:
        pad = 12
        min_x = max(0, x_idx.min() - pad)
        max_x = min(cell.width, x_idx.max() + pad)
        min_y = max(0, y_idx.min() - pad)
        max_y = min(cell.height, y_idx.max() + pad)
        rgba = rgba[min_y:max_y, min_x:max_x]
        
    out = Image.fromarray(rgba, 'RGBA')
    target_h = 112
    aspect = out.width / out.height
    target_w = int(round(target_h * aspect))
    return out.resize((target_w, target_h), Image.Resampling.LANCZOS)

def main():
    src_path = 'docs/gelen-gorseller/Gemini_Generated_Image_z8y6ogz8y6ogz8y6.jpg'
    out_dir = 'src/assets/art'
    os.makedirs(out_dir, exist_ok=True)
    
    img = Image.open(src_path)
    W, H = img.size
    cell_w = W // 3
    cell_h = H // 3
    
    grid = [
        ['quest-sprout', 'quest-target', 'quest-chain'],
        ['quest-recall', 'quest-dictation', 'quest-ear'],
        ['quest-dialogue', 'quest-speed', 'quest-trophy']
    ]
    
    for row in range(3):
        for col in range(3):
            name = grid[row][col]
            box = (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)
            cell = img.crop(box)
            processed = clean_white(cell)
            target_file = os.path.join(out_dir, f'{name}.webp')
            processed.save(target_file, 'WEBP', quality=95)
            print(f'Saved {target_file}: {processed.size}')

if __name__ == '__main__':
    main()
