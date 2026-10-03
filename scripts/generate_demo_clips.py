import os
import math
import subprocess
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 960, 540
FPS = 30
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

try:
    FONT_S = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 15)
    FONT_M = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 18)
    FONT_L = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
    FONT_XL = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 46)
    FONT_NUM = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 92)
except Exception:
    FONT_S = FONT_M = FONT_L = FONT_XL = FONT_NUM = ImageFont.load_default()

os.makedirs("public/clips/loop", exist_ok=True)
os.makedirs("public/clips/still", exist_ok=True)

# ── 1. LIQUID TABS ──────────────────────────────────────────────────────────
print("Generating LiquidTabs frames...")
tabs_frames = []
TOTAL_FRAMES_TABS = 120  # 4 seconds

for f in range(TOTAL_FRAMES_TABS):
    # progress 0 -> 1 -> 0
    cycle = (f / TOTAL_FRAMES_TABS) * 2 * math.pi
    p = 0.5 - 0.5 * math.cos(cycle) # 0 to 1
    
    # Eased pill position
    pill_t = 0.5 - 0.5 * math.cos(math.pi * p)
    
    img = Image.new("RGB", (W, H), "#e9e9eb")
    draw = ImageDraw.Draw(img, "RGBA")
    
    cw, ch = 380, 420
    cx0, cy0 = (W - cw) // 2, (H - ch) // 2
    cx1, cy1 = cx0 + cw, cy0 + ch
    
    # Shadow
    for s_i in range(1, 8):
        s_alpha = int(12 - s_i * 1.4)
        draw.rounded_rectangle([cx0 - s_i, cy0 + s_i * 2, cx1 + s_i, cy1 + s_i * 3], radius=22, fill=(0, 0, 0, s_alpha))
        
    # Card
    draw.rounded_rectangle([cx0, cy0, cx1, cy1], radius=20, fill="#ffffff", outline="#e2e2e5", width=1)
    
    # Tab Strip
    sw, sh = 356, 46
    sx0, sy0 = cx0 + 12, cy0 + 12
    sx1, sy1 = sx0 + sw, sy0 + sh
    draw.rounded_rectangle([sx0, sy0, sx1, sy1], radius=16, fill="#f2f2f5")
    
    # Liquid sliding pill
    tab_w = (sw - 12) // 3
    px0 = sx0 + 4 + pill_t * tab_w
    px1 = px0 + tab_w
    
    # Stretch effect during motion
    vel = math.sin(cycle)
    stretch = abs(vel) * 8
    draw.rounded_rectangle([px0 - stretch * 0.5, sy0 + 4, px1 + stretch * 0.5, sy1 - 4], radius=12, fill="#ffffff", outline="#e5e5e8", width=1)
    
    # Tab labels
    draw.text((sx0 + 36, sy0 + 13), "All", fill="#09090b" if pill_t < 0.5 else "#71717a", font=FONT_M)
    draw.text((sx0 + tab_w + 24, sy0 + 13), "Mentions", fill="#09090b" if pill_t >= 0.5 else "#71717a", font=FONT_M)
    draw.text((sx0 + tab_w * 2 + 26, sy0 + 13), "System", fill="#71717a", font=FONT_M)
    draw.polygon([(sx1 - 22, sy0 + 21), (sx1 - 16, sy0 + 21), (sx1 - 19, sy0 + 25)], fill="#a1a1aa")
    
    # Rows
    rows = [
        ("Activity", "All notification stream", "12:10", pill_t < 0.5),
        ("Security Alert", "New sign-in detected", "13:00", pill_t >= 0.5),
        ("Badge Earned", "Pro Contributor awarded", "13:10", False),
        ("Verified", "Domain DNS verified", "14:25", False),
    ]
    
    for r_i, (title, sub, time_str, sel) in enumerate(rows):
        ry0 = cy0 + 74 + r_i * 78
        ry1 = ry0 + 68
        rx0, rx1 = cx0 + 12, cx1 - 12
        
        if sel:
            draw.rounded_rectangle([rx0, ry0, rx1, ry1], radius=14, fill="#f8f8fa")
            
        # Avatar circle
        av_x0, av_y0 = rx0 + 10, ry0 + 14
        av_x1, av_y1 = av_x0 + 40, av_y0 + 40
        av_bg = "#09090b" if sel else "#eeeeef"
        av_fg = "#ffffff" if sel else "#27272a"
        draw.ellipse([av_x0, av_y0, av_x1, av_y1], fill=av_bg)
        draw.ellipse([av_x0 + 12, av_y0 + 12, av_x1 - 12, av_y1 - 12], outline=av_fg, width=2)
        
        # Text
        draw.text((av_x1 + 14, ry0 + 14), title, fill="#09090b", font=FONT_M)
        draw.text((av_x1 + 14, ry0 + 38), sub, fill="#71717a", font=FONT_S)
        draw.text((rx1 - 42, ry0 + 16), time_str, fill="#a1a1aa", font=FONT_S)
        
    tabs_frames.append(img)

# ── 2. THERMAL DIAL ─────────────────────────────────────────────────────────
print("Generating ThermalDial frames...")
dial_frames = []
TOTAL_FRAMES_DIAL = 150  # 5 seconds

for f in range(TOTAL_FRAMES_DIAL):
    cycle = (f / TOTAL_FRAMES_DIAL) * 2 * math.pi
    # Temp sweeps between 22°C and 48°C
    temp = 35 + 13 * math.sin(cycle)
    
    img = Image.new("RGB", (W, H), "#060607")
    draw = ImageDraw.Draw(img, "RGBA")
    
    cw, ch = 340, 390
    cx0, cy0 = (W - cw) // 2, (H - ch) // 2
    cx1, cy1 = cx0 + cw, cy0 + ch
    
    # Ambient Bloom behind card
    bloom_alpha = int(40 + 20 * math.sin(cycle))
    draw.ellipse([cx0 + 20, cy1 - 40, cx1 - 20, cy1 + 60], fill=(255, 120, 30, bloom_alpha))
    
    # Obsidian card
    draw.rounded_rectangle([cx0, cy0, cx1, cy1], radius=44, fill="#0d0d10", outline="#222226", width=1)
    
    # Heat Wash rising from bottom
    for w_i in range(110):
        y_pos = cy1 - w_i
        w_frac = w_i / 110.0
        r_c = int(255 * (1 - w_frac * 0.4))
        g_c = int(90 * (1 - w_frac))
        b_c = 20
        alpha_val = int(80 * (1 - w_frac) * (temp / 50.0))
        draw.line([cx0 + 20, y_pos, cx1 - 20, y_pos], fill=(r_c, g_c, b_c, alpha_val))
        
    # Radial Dial Ticks
    center_x, center_y = cx0 + cw // 2, cy0 + 260
    radius = 125
    A0, A1 = -115, 115
    cur_angle = A0 + ((temp - (-10)) / (70 - (-10))) * (A1 - A0)
    
    N_TICKS = 64
    for i in range(N_TICKS):
        tf = i / (N_TICKS - 1)
        a_deg = A0 + tf * (A1 - A0)
        a_rad = math.radians(a_deg - 90)
        
        is_lit = a_deg <= cur_angle
        t_len = 10 if is_lit else 7
        if is_lit and abs(a_deg - cur_angle) < 14:
            t_len = 14 # comet
            
        x_inner = center_x + (radius - t_len) * math.cos(a_rad)
        y_inner = center_y + (radius - t_len) * math.sin(a_rad)
        x_outer = center_x + radius * math.cos(a_rad)
        y_outer = center_y + radius * math.sin(a_rad)
        
        t_col = (255, 255, 255, 230) if is_lit else (255, 255, 255, 60)
        draw.line([x_inner, y_inner, x_outer, y_outer], fill=t_col, width=2)
        
    # Needle
    needle_rad = math.radians(cur_angle - 90)
    nx0 = center_x + (radius - 18) * math.cos(needle_rad)
    ny0 = center_y + (radius - 18) * math.sin(needle_rad)
    nx1 = center_x + (radius - 75) * math.cos(needle_rad)
    ny1 = center_y + (radius - 75) * math.sin(needle_rad)
    draw.line([nx0, ny0, nx1, ny1], fill="#ffffff", width=3)
    
    # Season Title
    season = "Summer" if temp >= 26 else "Spring"
    bbox = FONT_L.getbbox(season)
    sw = bbox[2] - bbox[0]
    draw.text((cx0 + (cw - sw) // 2, cy0 + 52), season, fill="#f4f4f5", font=FONT_L)
    
    # Number
    temp_int = int(round(temp))
    num_str = f"{temp_int}"
    bbox_num = FONT_NUM.getbbox(num_str)
    nw = bbox_num[2] - bbox_num[0]
    draw.text((cx0 + (cw - nw) // 2 - 8, cy0 + 115), num_str, fill="#ffffff", font=FONT_NUM)
    # Degree circle
    deg_x = cx0 + (cw - nw) // 2 + nw + 4
    draw.ellipse([deg_x, cy0 + 130, deg_x + 12, cy0 + 142], outline="#ffffff", width=2)
    
    dial_frames.append(img)

# ── 3. LAMP SWITCH ──────────────────────────────────────────────────────────
print("Generating LampSwitch frames...")
lamp_frames = []
TOTAL_FRAMES_LAMP = 150  # 5 seconds

for f in range(TOTAL_FRAMES_LAMP):
    # Light toggles ON during first half, OFF during second
    is_on = f < 80
    cycle = (f / TOTAL_FRAMES_LAMP) * 2 * math.pi
    
    # Gentle pendulum sway
    sway = math.sin(cycle * 2) * 5.0
    cord_y = 2.0 * math.sin(cycle * 4)
    
    img = Image.new("RGB", (W, H), "#171513")
    draw = ImageDraw.Draw(img, "RGBA")
    
    cw, ch = 380, 380
    cx0, cy0 = (W - cw) // 2, (H - ch) // 2
    cx1, cy1 = cx0 + cw, cy0 + ch
    
    # Background card
    draw.rounded_rectangle([cx0, cy0, cx1, cy1], radius=48, fill="#0c0b0a", outline="#201e1c", width=1)
    
    # Concentric rings
    for r_i in range(120, 260, 16):
        draw.arc([cx0 + cw // 2 - r_i, cy0 - 40 - r_i, cx0 + cw // 2 + r_i, cy0 - 40 + r_i], start=30, end=150, fill=(255, 255, 255, 12 if not is_on else 22), width=1)
        
    lamp_x = cx0 + cw // 2 + sway
    lamp_y = cy0 + 115 + cord_y
    
    # Cord
    draw.line([cx0 + cw // 2, cy0 - 20, lamp_x, lamp_y - 45], fill="#715c44", width=3)
    
    # Light beam when on
    if is_on:
        beam_poly = [
            (lamp_x - 30, lamp_y),
            (lamp_x + 30, lamp_y),
            (cx1 - 25, cy1 - 20),
            (cx0 + 25, cy1 - 20),
        ]
        draw.polygon(beam_poly, fill=(255, 240, 210, 32))
        draw.ellipse([lamp_x - 24, lamp_y - 8, lamp_x + 24, lamp_y + 16], fill=(255, 250, 220, 120))
        
    # Ceramic Shade
    shade_poly = [
        (lamp_x - 14, lamp_y - 42),
        (lamp_x + 14, lamp_y - 42),
        (lamp_x + 46, lamp_y),
        (lamp_x - 46, lamp_y),
    ]
    draw.polygon(shade_poly, fill="#e8e4dc", outline="#bcb6ab")
    draw.ellipse([lamp_x - 14, lamp_y - 48, lamp_x + 14, lamp_y - 38], fill="#c49a6c") # wood top
    draw.ellipse([lamp_x - 46, lamp_y - 6, lamp_x + 46, lamp_y + 6], fill="#fff8e6" if is_on else "#55524c") # rim
    
    # Liquid Switch at bottom
    sw_w, sw_h = 210, 76
    sw_x0 = cx0 + (cw - sw_w) // 2
    sw_y0 = cy1 - 100
    sw_x1 = sw_x0 + sw_w
    sw_y1 = sw_y0 + sw_h
    draw.rounded_rectangle([sw_x0, sw_y0, sw_x1, sw_y1], radius=38, fill="#2a2926", outline="#3f3d38", width=1)
    
    # Switch labels
    draw.text((sw_x0 + 26, sw_y0 + 22), "On", fill="#ffffff" if is_on else "#78756f", font=FONT_L)
    draw.text((sw_x1 - 62, sw_y0 + 22), "Off", fill="#78756f" if is_on else "#ffffff", font=FONT_L)
    
    # Knob
    knob_target_x = (sw_x1 - 76) if is_on else (sw_x0 + 4)
    draw.ellipse([knob_target_x, sw_y0 + 4, knob_target_x + 68, sw_y1 - 4], fill="#858279" if is_on else "#4b4945")
    # Power icon on knob
    k_center_x = knob_target_x + 34
    k_center_y = sw_y0 + 38
    draw.line([k_center_x, k_center_y - 12, k_center_x, k_center_y], fill="#ffffff", width=2)
    draw.arc([k_center_x - 11, k_center_y - 11, k_center_x + 11, k_center_y + 11], start=30, end=330, fill="#ffffff", width=2)
    
    lamp_frames.append(img)

# ── Function to save MP4 and JPG ───────────────────────────────────────────
def export_clip(name, frames):
    jpg_path = f"public/clips/loop/{name}.jpg"
    still_path = f"public/clips/still/{name}.jpg"
    mp4_path = f"public/clips/loop/{name}.mp4"
    
    # Save poster JPG
    frames[0].save(jpg_path, "JPEG", quality=92)
    frames[0].save(still_path, "JPEG", quality=92)
    print(f"Saved {jpg_path}")
    
    # Save frames to temp folder and encode with ffmpeg
    temp_dir = f"temp_frames_{name}"
    os.makedirs(temp_dir, exist_ok=True)
    for idx, f in enumerate(frames):
        f.save(os.path.join(temp_dir, f"frame_{idx:04d}.png"))
        
    cmd = [
        FFMPEG,
        "-y",
        "-r", str(FPS),
        "-i", os.path.join(temp_dir, "frame_%04d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-b:v", "180k",
        "-maxrate", "280k",
        "-bufsize", "500k",
        "-movflags", "+faststart",
        "-metadata", "comment=Made with Remotion 4.0.531",
        mp4_path
    ]
    subprocess.run(cmd, check=True)
    print(f"Encoded {mp4_path}")
    
    # Cleanup temp frames
    for idx in range(len(frames)):
        try:
            os.remove(os.path.join(temp_dir, f"frame_{idx:04d}.png"))
        except:
            pass
    try:
        os.rmdir(temp_dir)
    except:
        pass

export_clip("liquid-tabs", tabs_frames)
export_clip("thermal-dial", dial_frames)
export_clip("lamp-switch", lamp_frames)
print("All demo video clips successfully generated!")
