import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Wedge, Rectangle
from matplotlib.widgets import Slider, Button

# 默认参数设置，确保中文字体与 Latex 公式美观
mpl.rcParams['lines.antialiased'] = True
mpl.rcParams['patch.antialiased'] = True
plt.rcParams.update({
    "font.family": "SimHei",
    "mathtext.fontset": "cm",
    "axes.unicode_minus": False,
    "font.size": 11
})

# 莫兰迪配色方案
MORANDI = {
    'bg': '#FBF9F6',          # 温暖白背景
    'even_sector': '#E8C5C0', # 莫兰迪粉红（下排）
    'odd_sector': '#BAC7D5',  # 莫兰迪蓝（上排）
    'aux_line': '#9BA4A6',    # 辅助灰色
    'text': '#3C4043',        # 深灰文字
    'accent': '#D0BC96',      # 麦芽黄（强调）
    'slider_track': '#EAE5DF',
    'slider_fill': '#C8B195'
}

# 初始参数
init_n = 16
init_t = 0.0  # 0.0 表示圆，1.0 表示拼成的长方形
R = 1.0

fig = plt.figure(figsize=(10, 6), facecolor=MORANDI['bg'])
ax = fig.add_axes([0.05, 0.20, 0.90, 0.75])
ax.set_aspect('equal')
ax.axis('off')

# 设置视口范围，能够同时容纳圆与展开后的长方形
ax.set_xlim(-2.0, 2.0)
ax.set_ylim(-1.3, 1.3)

# 动态保存绘制的 patch 和 text 引用
patches = []
labels = []
aux_shapes = []

def interpolate_angle(alpha, beta):
    """计算最小旋转角差值，使扇形旋转过渡自然"""
    diff = beta - alpha
    diff = (diff + np.pi) % (2 * np.pi) - np.pi
    return alpha, diff

def draw_geometry(n, t):
    """绘制指定份数 n 和展开进度 t 的几何图形"""
    # 清除旧的图形和标注
    for p in patches:
        p.remove()
    patches.clear()
    for l in labels:
        l.remove()
    labels.clear()
    for s in aux_shapes:
        s.remove()
    aux_shapes.clear()

    theta = 2 * np.pi / n
    # 计算当前近似长方形的半宽与半高
    W_half = (n * R * np.sin(theta / 2)) / 2
    H_half = (R * np.cos(theta / 2)) / 2

    # 绘制辅助背景虚线框（长方形目标位置）
    if t > 0.1:
        rect = Rectangle(
            (-W_half, -H_half), 2 * W_half, 2 * H_half,
            fill=False, edgecolor=MORANDI['aux_line'],
            linestyle='--', linewidth=0.8, alpha=t
        )
        ax.add_patch(rect)
        aux_shapes.append(rect)

    # 循环绘制每个扇形
    for i in range(n):
        # 1. 计算圆状态下的初始参数
        alpha = (i + 0.5) * theta
        
        # 2. 计算长方形状态下的目标位置与方向
        # 偶数在下朝上，奇数在上朝下
        if i % 2 == 0:
            x_target = (i - (n - 1) / 2) * R * np.sin(theta / 2)
            y_target = -H_half
            beta = np.pi / 2
            color = MORANDI['even_sector']
        else:
            x_target = (i - (n - 1) / 2) * R * np.sin(theta / 2)
            y_target = H_half
            beta = -np.pi / 2
            color = MORANDI['odd_sector']

        # 3. 线性插值计算当前状态的中心位置与旋转角
        cx = t * x_target
        cy = t * y_target
        
        alpha_init, diff = interpolate_angle(alpha, beta)
        current_angle = alpha_init + t * diff
        
        # Wedge 的角度单位是角度值
        angle_deg = np.degrees(current_angle)
        theta_half_deg = np.degrees(theta / 2)
        
        theta1 = angle_deg - theta_half_deg
        theta2 = angle_deg + theta_half_deg

        # 4. 绘制扇形
        wedge = Wedge(
            (cx, cy), R, theta1, theta2,
            facecolor=color, edgecolor='white', linewidth=0.8, alpha=0.9
        )
        ax.add_patch(wedge)
        patches.append(wedge)

    # 5. 添加数学标注
    if t < 0.5:
        # 圆状态下的半径标注
        r_line, = ax.plot([0, R * np.cos(0.5)], [0, R * np.sin(0.5)], color=MORANDI['text'], lw=1.2, ls='-')
        patches.append(r_line)
        r_text = ax.text(0.5 * R * np.cos(0.5) - 0.05, 0.5 * R * np.sin(0.5) + 0.1, r"$r$", 
                         color=MORANDI['text'], fontsize=14, ha='center')
        labels.append(r_text)
    
    if t > 0.5:
        # 近似长方形的宽与高标注
        # 底部标注（宽 = 2 * W_half ≈ \pi * r）
        w_text = ax.text(0, -H_half - 0.25, r"宽 $\approx \pi r$", 
                         color=MORANDI['text'], fontsize=12, ha='center', alpha=t)
        # 右侧标注（高 = r）
        h_text = ax.text(W_half + 0.15, 0, r"高 $\approx r$", 
                         color=MORANDI['text'], fontsize=12, va='center', ha='left', alpha=t)
        labels.append(w_text)
        labels.append(h_text)

    # 顶部公式展示
    formula_str = r"拼合面积 $\approx$ 长 $\times$ 宽 $= \pi r \times r = \pi r^2$"
    title_text = ax.text(0, 1.1, formula_str if t > 0.8 else r"圆的面积公式推导", 
                         color=MORANDI['text'], fontsize=14, ha='center', weight='bold')
    labels.append(title_text)

# 首次绘制
draw_geometry(init_n, init_t)

# 创建 UI 交互控件
ax_slider_t = fig.add_axes([0.15, 0.08, 0.40, 0.03], facecolor=MORANDI['bg'])
ax_slider_n = fig.add_axes([0.15, 0.03, 0.40, 0.03], facecolor=MORANDI['bg'])
ax_btn_reset = fig.add_axes([0.75, 0.04, 0.10, 0.06], facecolor=MORANDI['bg'])

slider_t = Slider(
    ax=ax_slider_t,
    label='拼接程度 ',
    valmin=0.0,
    valmax=1.0,
    valinit=init_t,
    valfmt='%.2f',
    color=MORANDI['slider_fill'],
    track_color=MORANDI['slider_track']
)
slider_t.label.set_color(MORANDI['text'])
slider_t.valtext.set_color(MORANDI['text'])

slider_n = Slider(
    ax=ax_slider_n,
    label='等分份数 $n$ ',
    valmin=4,
    valmax=64,
    valinit=init_n,
    valstep=2,
    valfmt='%d',
    color=MORANDI['slider_fill'],
    track_color=MORANDI['slider_track']
)
slider_n.label.set_color(MORANDI['text'])
slider_n.valtext.set_color(MORANDI['text'])

# 移除滑动条边框
for ax_slider in [ax_slider_t, ax_slider_n]:
    for spine in ax_slider.spines.values():
        spine.set_visible(False)

btn_reset = Button(
    ax=ax_btn_reset,
    label='重置',
    color='white',
    hovercolor='#F1F6F6'
)
for spine in ax_btn_reset.spines.values():
    spine.set_color(MORANDI['aux_line'])
    spine.set_linewidth(0.8)
btn_reset.label.set_color(MORANDI['text'])

# 更新回调函数
def update(val):
    t = slider_t.val
    n = int(slider_n.val)
    draw_geometry(n, t)
    fig.canvas.draw_idle()

slider_t.on_changed(update)
slider_n.on_changed(update)

def reset(event):
    slider_t.reset()
    slider_n.reset()

btn_reset.on_clicked(reset)

plt.show()