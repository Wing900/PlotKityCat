import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib.widgets import Slider, Button

# 基础配置
mpl.rcParams['lines.antialiased'] = True
mpl.rcParams['patch.antialiased'] = True
plt.rcParams.update({
    "font.family": "SimHei",
    "mathtext.fontset": "cm",
    "axes.unicode_minus": False,
    "font.size": 11
})

# 莫兰迪色系定义
BG_COLOR = '#FAF9F6'         # 暖白背景
TEXT_COLOR = '#2F3A40'       # 深灰
LINE_AUX = '#AEB9BF'         # 辅助灰蓝
LINE_MAIN = '#4A5B66'        # 主线
COLOR_SPHERE = '#D0D9D9'     # 球体轮廓线
COLOR_PYRAMID_SIDE = '#B8DCCF' # 侧面粉绿
COLOR_PYRAMID_BASE = '#BFD4E6' # 底面粉蓝
COLOR_HEIGHT = '#D99B9B'     # 高度高亮粉红
COLOR_CURVE = '#AFC4E8'      # 2D曲线粉蓝

# 初始参数：体积最大时的理论高度为 sqrt(3)/3 ≈ 0.577
h_init = 1.0 / np.sqrt(3)

# 创建画布
fig = plt.figure(figsize=(11, 6), facecolor=BG_COLOR)

# [左子图]: 3D 几何展示
ax3d = fig.add_axes([0.05, 0.15, 0.45, 0.8], projection='3d', proj_type='ortho')
ax3d.set_axis_off()
ax3d.set_facecolor(BG_COLOR)
ax3d.view_init(elev=22, azim=-55)
ax3d.set_xlim(-1.1, 1.1)
ax3d.set_ylim(-1.1, 1.1)
ax3d.set_zlim(-1.1, 1.1)
ax3d.set_box_aspect([1, 1, 1])

# [右子图]: 2D 曲线展示
ax2d = fig.add_axes([0.58, 0.25, 0.35, 0.55])
ax2d.set_facecolor(BG_COLOR)
ax2d.spines['top'].set_visible(False)
ax2d.spines['right'].set_visible(False)
ax2d.spines['left'].set_color(LINE_AUX)
ax2d.spines['bottom'].set_color(LINE_AUX)
ax2d.tick_params(colors=TEXT_COLOR)
ax2d.set_xlabel("高  $h$", color=TEXT_COLOR, fontsize=12)
ax2d.set_ylabel("体积  $V$", color=TEXT_COLOR, fontsize=12)
ax2d.set_title("四棱锥体积与高的变化曲线", color=TEXT_COLOR, fontsize=13, pad=15)

# 1. 绘制球体经纬大圆线作为透视参考
theta = np.linspace(0, 2 * np.pi, 100)
ax3d.plot(np.cos(theta), np.sin(theta), 0, color=COLOR_SPHERE, lw=0.8, ls='--')
ax3d.plot(np.cos(theta), 0, np.sin(theta), color=COLOR_SPHERE, lw=0.8, ls='--')
ax3d.plot(0, np.cos(theta), np.sin(theta), color=COLOR_SPHERE, lw=0.8, ls='--')

# 标注球心 O
ax3d.plot([0], [0], [0], 'o', color=TEXT_COLOR, ms=4)
text_O = ax3d.text(0.05, 0.05, 0.08, r"$O$", color=TEXT_COLOR, fontsize=12)


def get_pyramid_geometry(h):
    """根据给定的高 h 计算内接四棱锥的各个顶点及底面外接圆"""
    r = np.sqrt(1.0 - h**2)
    O = np.array([0, 0, 0])
    
    # 底面正方形的四个顶点在球面上
    A = np.array([r, 0, -h])
    B = np.array([0, r, -h])
    C = np.array([-r, 0, -h])
    D = np.array([0, -r, -h])
    
    sides = [[O, A, B], [O, B, C], [O, C, D], [O, D, A]]
    base = [[A, B, C, D]]
    
    # 计算底面截面圆轨道
    t_vals = np.linspace(0, 2 * np.pi, 100)
    circle_x = r * np.cos(t_vals)
    circle_y = r * np.sin(t_vals)
    circle_z = -h * np.ones_like(t_vals)
    
    return sides, base, (circle_x, circle_y, circle_z), A, B, C, D


# 初始化 3D 棱锥和截面圆
sides, base, circle_data, pA, pB, pC, pD = get_pyramid_geometry(h_init)

poly_sides = Poly3DCollection(sides, facecolors=COLOR_PYRAMID_SIDE, edgecolors=LINE_MAIN, linewidths=1.0, alpha=0.35)
ax3d.add_collection3d(poly_sides)

poly_base = Poly3DCollection(base, facecolors=COLOR_PYRAMID_BASE, edgecolors=LINE_MAIN, linewidths=1.2, alpha=0.5)
ax3d.add_collection3d(poly_base)

line_circle, = ax3d.plot(circle_data[0], circle_data[1], circle_data[2], color=LINE_AUX, lw=0.8, ls=':')
line_height, = ax3d.plot([0, 0], [0, 0], [0, -h_init], color=COLOR_HEIGHT, lw=2.2, ls='-')
dot_base_center, = ax3d.plot([0], [0], [-h_init], 'o', color=COLOR_HEIGHT, ms=4)

# 动态文本容器
text_artists = []


def update_labels(A, B, C, D, h):
    """刷新3D顶点和高度标注位置"""
    for artist in text_artists:
        artist.remove()
    text_artists.clear()
    
    tA = ax3d.text(A[0] + 0.05, A[1], A[2] - 0.05, r"$A$", color=TEXT_COLOR, fontsize=11)
    tB = ax3d.text(B[0], B[1] + 0.05, B[2] - 0.05, r"$B$", color=TEXT_COLOR, fontsize=11)
    tC = ax3d.text(C[0] - 0.08, C[1], C[2] - 0.05, r"$C$", color=TEXT_COLOR, fontsize=11)
    tD = ax3d.text(D[0], D[1] - 0.08, D[2] - 0.05, r"$D$", color=TEXT_COLOR, fontsize=11)
    th = ax3d.text(0.06, 0, -h / 2, r"$h$", color=COLOR_HEIGHT, fontsize=12, weight='bold')
    
    text_artists.extend([tA, tB, tC, tD, th])


update_labels(pA, pB, pC, pD, h_init)

# 2D 曲线绘制
h_vals = np.linspace(0.0, 1.0, 200)
v_vals = (2.0 / 3.0) * (h_vals - h_vals**3)
ax2d.plot(h_vals, v_vals, color=COLOR_CURVE, lw=2.0, label=r"$V = \frac{2}{3}(h - h^3)$")

# 标注理论最大值点
h_opt = 1.0 / np.sqrt(3)
v_opt = (2.0 / 3.0) * (h_opt - h_opt**3)
ax2d.plot(h_opt, v_opt, 'o', color=COLOR_HEIGHT, ms=6)
ax2d.text(h_opt + 0.03, v_opt + 0.01, r"最大值点 $h = \frac{\sqrt{3}}{3}$", color=TEXT_COLOR, fontsize=10)

# 当前状态点与垂线指示
line_v_loc, = ax2d.plot([h_init, h_init], [0, v_opt], color=LINE_AUX, lw=0.8, ls='--')
dot_current, = ax2d.plot([h_init], [v_opt], 'o', color=LINE_MAIN, ms=6)

# 填充当前包络面积的半透明阴影
fill_container = [ax2d.fill_between(h_vals, 0, v_vals, where=(h_vals <= h_init), color=COLOR_CURVE, alpha=0.15)]
ax2d.legend(frameon=False, loc='upper left')

# [控件轴定义]
ax_slider = fig.add_axes([0.15, 0.06, 0.28, 0.03], facecolor=BG_COLOR)
slider_h = Slider(
    ax=ax_slider,
    label='高度 $h$ ',
    valmin=0.01,
    valmax=0.99,
    valinit=h_init,
    valfmt='%.3f',
    color=COLOR_PYRAMID_SIDE,
    track_color='#EAEAEA',
    initcolor='none'
)
for spine in ax_slider.spines.values():
    spine.set_visible(False)
ax_slider.set_xticks([])
ax_slider.set_yticks([])
slider_h.label.set_color(TEXT_COLOR)
slider_h.valtext.set_color(TEXT_COLOR)

ax_btn = fig.add_axes([0.48, 0.06, 0.08, 0.03], facecolor=BG_COLOR)
btn_reset = Button(ax_btn, '最大体积', color='white', hovercolor='#F1F6F6')
for spine in ax_btn.spines.values():
    spine.set_color(LINE_AUX)
    spine.set_linewidth(0.8)
btn_reset.label.set_color(TEXT_COLOR)


# 交互更新逻辑
def update(val):
    h = slider_h.val
    
    # 重新计算 3D 结构
    sides, base, circle_data, A, B, C, D = get_pyramid_geometry(h)
    
    # 更新三维棱锥和高度线
    poly_sides.set_verts(sides)
    poly_base.set_verts(base)
    line_circle.set_data(circle_data[0], circle_data[1])
    line_circle.set_3d_properties(circle_data[2])
    line_height.set_data([0, 0], [0, 0])
    line_height.set_3d_properties([0, -h])
    dot_base_center.set_data([0], [0])
    dot_base_center.set_3d_properties([-h])
    
    # 更新顶点标签位置
    update_labels(A, B, C, D, h)
    
    # 更新 2D 指示器
    v = (2.0 / 3.0) * (h - h**3)
    dot_current.set_data([h], [v])
    line_v_loc.set_data([h, h], [0, v])
    
    # 重绘阴影区域
    fill_container[0].remove()
    fill_container[0] = ax2d.fill_between(h_vals, 0, v_vals, where=(h_vals <= h), color=COLOR_CURVE, alpha=0.15)
    
    fig.canvas.draw_idle()


def reset(event):
    slider_h.set_val(h_opt)


slider_h.on_changed(update)
btn_reset.on_clicked(reset)

plt.show()