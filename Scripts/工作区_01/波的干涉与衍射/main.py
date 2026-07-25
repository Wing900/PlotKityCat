import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.widgets import Slider, Button

# 基础环境配置
mpl.rcParams['lines.antialiased'] = True
mpl.rcParams['patch.antialiased'] = True
mpl.rcParams["axes3d.mouserotationstyle"] = "azel"
plt.rcParams.update({
    "font.family": "SimHei",
    "mathtext.fontset": "cm",
    "axes.unicode_minus": False,
    "font.size": 10
})

# Macaron Color Palette
MACARON = {
    'bg_light': '#FDFBF7',
    'wave_low': '#B5EAD7',     # Mint pastel
    'wave_mid': '#E8F5E9',     # Very light green/white
    'wave_high': '#FFB7B2',    # Soft pink
    'line_dark': '#5D6D7E',    # Slate gray
    'line_light': '#BDC3C7',   # Light gray
    'accent': '#FFDAC1'        # Peach pastel
}

# Create custom colormap for the wave field
colors = [MACARON['wave_low'], MACARON['wave_mid'], MACARON['wave_high']]
macaron_cmap = LinearSegmentedColormap.from_list("macaron_wave", colors, N=256)

# Grid generation
x = np.linspace(-10, 10, 120)
y = np.linspace(0.1, 15, 120)
X, Y = np.meshgrid(x, y)

# Physics calculation functions
def calculate_waves(X, Y, d, lam, phase=0.0):
    """Calculate the wave displacement field from two coherent sources."""
    k = 2 * np.pi / lam
    # Distance from sources S1(-d/2, 0) and S2(d/2, 0)
    r1 = np.sqrt((X + d/2)**2 + Y**2 + 0.2)
    r2 = np.sqrt((X - d/2)**2 + Y**2 + 0.2)
    
    # Damped waves to simulate propagation loss
    z1 = (np.cos(k * r1 - phase) / np.sqrt(r1))
    z2 = (np.cos(k * r2 - phase) / np.sqrt(r2))
    return z1 + z2

def calculate_intensity(x_line, d, lam):
    """Calculate the time-averaged intensity at the screen (y = 15)."""
    y_screen = 15.0
    r1 = np.sqrt((x_line + d/2)**2 + y_screen**2)
    r2 = np.sqrt((x_line - d/2)**2 + y_screen**2)
    k = 2 * np.pi / lam
    # Intensity distribution combining interference envelope
    I = 1/r1 + 1/r2 + 2 / np.sqrt(r1 * r2) * np.cos(k * (r1 - r2))
    return I

# Initialize parameters
init_d = 4.0
init_lam = 1.8
x_screen = np.linspace(-10, 10, 300)

# Setup Figure
fig = plt.figure(figsize=(12, 6.5), facecolor=MACARON['bg_light'])

# [Left Subplot]: 3D Wave Interference Field
ax1 = fig.add_axes([0.05, 0.22, 0.48, 0.73], projection='3d', proj_type='ortho')
ax1.set_facecolor(MACARON['bg_light'])
ax1.view_init(elev=35, azim=-60)

# [Right Subplot]: 2D Screen Intensity
ax2 = fig.add_axes([0.60, 0.26, 0.35, 0.62])
ax2.set_facecolor(MACARON['bg_light'])
ax2.spines['top'].set_visible(False)
ax2.spines['right'].set_visible(False)
ax2.spines['left'].set_color(MACARON['line_light'])
ax2.spines['bottom'].set_color(MACARON['line_light'])

# Set Labels
ax1.set_title("双缝干涉与衍射空间波面 ($z$ 轴代表波幅)", pad=10, fontsize=12)
ax2.set_title("接收屏上的光强/波强分布 $I(x)$", pad=15, fontsize=12)
ax2.set_xlabel("位置 $x$", color=MACARON['line_dark'])
ax2.set_ylabel("强度 $I$", color=MACARON['line_dark'])

# Initial calculations
Z = calculate_waves(X, Y, init_d, init_lam)
I = calculate_intensity(x_screen, init_d, init_lam)

# 3D Surface Plot
surf = ax1.plot_surface(X, Y, Z, cmap=macaron_cmap, rstride=1, cstride=1, 
                        linewidth=0, antialiased=True, alpha=0.9, shade=True)
ax1.set_zlim(-2.5, 2.5)
ax1.set_xlim(-10, 10)
ax1.set_ylim(0, 15)
ax1.set_axis_off()  # Keep it clean

# Visual decoration: Sources indicators
source_dots, = ax1.plot([-init_d/2, init_d/2], [0, 0], [0, 0], 'o', 
                        color=MACARON['line_dark'], ms=8, label="相干波源")

# 2D Screen Plot
line2d, = ax2.plot(x_screen, I, color=MACARON['line_dark'], lw=2)
fill_area = ax2.fill_between(x_screen, 0, I, color=MACARON['wave_high'], alpha=0.4)
ax2.set_xlim(-10, 10)
ax2.set_ylim(0, 1.8)

# UI Control Elements Layout
ax_slider_d = fig.add_axes([0.15, 0.08, 0.30, 0.025])
ax_slider_lam = fig.add_axes([0.15, 0.03, 0.30, 0.025])
ax_btn = fig.add_axes([0.80, 0.04, 0.10, 0.05])

slider_d = Slider(ax_slider_d, '波源间距 $d$', 1.5, 8.0, valinit=init_d, 
                  color=MACARON['wave_high'], track_color=MACARON['wave_mid'])
slider_lam = Slider(ax_slider_lam, '波长 $\\lambda$', 0.8, 3.5, valinit=init_lam, 
                    color=MACARON['wave_low'], track_color=MACARON['wave_mid'])

# Style sliders text
slider_d.label.set_color(MACARON['line_dark'])
slider_d.valtext.set_color(MACARON['line_dark'])
slider_lam.label.set_color(MACARON['line_dark'])
slider_lam.valtext.set_color(MACARON['line_dark'])
ax_slider_d.set_facecolor(MACARON['bg_light'])
ax_slider_lam.set_facecolor(MACARON['bg_light'])

# Style reset button
btn = Button(ax_btn, '重置参数', color=MACARON['wave_mid'], hovercolor=MACARON['wave_low'])
for spine in ax_btn.spines.values(): 
    spine.set_color(MACARON['line_light'])
btn.label.set_color(MACARON['line_dark'])

# Update Callback
def update(val):
    d = slider_d.val
    lam = slider_lam.val
    
    # Recalculate 3D Wave Field
    global surf, fill_area
    surf.remove()
    new_Z = calculate_waves(X, Y, d, lam)
    surf = ax1.plot_surface(X, Y, new_Z, cmap=macaron_cmap, rstride=1, cstride=1, 
                            linewidth=0, antialiased=True, alpha=0.9, shade=True)
    
    # Update sources positions
    source_dots.set_data([-d/2, d/2], [0, 0])
    source_dots.set_3d_properties([0, 0], 'z')
    
    # Recalculate 2D screen intensity
    new_I = calculate_intensity(x_screen, d, lam)
    line2d.set_ydata(new_I)
    
    # Update fill area
    fill_area.remove()
    fill_area = ax2.fill_between(x_screen, 0, new_I, color=MACARON['wave_high'], alpha=0.4)
    
    # Rescale 2D Y limit dynamically if needed
    ax2.set_ylim(0, max(new_I) * 1.2)
    
    fig.canvas.draw_idle()

slider_d.on_changed(update)
slider_lam.on_changed(update)

def reset(event):
    slider_d.reset()
    slider_lam.reset()
btn.on_clicked(reset)

plt.show()