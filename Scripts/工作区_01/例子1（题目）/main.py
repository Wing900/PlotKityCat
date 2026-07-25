import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib.widgets import Slider, Button

# 默认参数配置
mpl.rcParams['lines.antialiased'] = True
mpl.rcParams['patch.antialiased'] = True
mpl.rcParams["axes3d.mouserotationstyle"] = "azel"

plt.rcParams.update({
    "font.family": "SimHei",
    "mathtext.fontset": "cm",
    "axes.unicode_minus": False,
    "font.size": 10
})

# 马卡龙莫兰迪色系配置
MORANDI = {
    'bg': '#FAF8F5',            # 暖白背景
    'line_main': '#3D405B',     # 深灰主色
    'line_aux': '#C5C9D0',      # 浅灰辅助线
    'line_highlight': '#D66853',# 柔和砖红 (高亮折线)
    'line_optimal': '#5B8C85',  # 莫兰迪青蓝 (最优/展开路径)
    'face_base': '#E0E5DC',     # 莫兰迪淡绿 (底面)
    'face_fold1': '#F4F1DE',    # 莫兰迪淡黄 (翻折面PAB)
    'face_fold2': '#E4C1F9',    # 莫兰迪淡紫 (翻折面DBC)
    'text': '#3D405B',
}

# 基础几何常数
# A(0,2,0), B(0,0,0), C(2,0,0), D(2,2,0), P(0,2,1)
A_val = np.array([0.0, 2.0, 0.0])
B_val = np.array([0.0, 0.0, 0.0])
C_val = np.array([2.0, 0.0, 0.0])

def get_P_t(t):
    """计算 P 点随展开进度 t 旋转的坐标"""
    theta = t * np.pi / 2
    return np.array([-np.sin(theta), 2.0, np.cos(theta)])

def get_D_t(t):
    """计算 D 点随展开进度 t 旋转的坐标"""
    phi = t * np.pi
    return np.array([2.0, 2.0 * np.cos(phi), 2.0 * np.sin(phi)])

# 创建画布
fig = plt.figure(figsize=(12, 6.5), facecolor=MORANDI['bg'])

# [左子图]: 3D 空间翻折
ax3d = fig.add_axes([0.03, 0.18, 0.45, 0.77], projection='3d', proj_type='ortho')
ax3d.set_facecolor(MORANDI['bg'])
ax3d.view_init(elev=22, azim=-55)
ax3d.set_axis_off()

# 设置 3D 视界范围
ax3d.set_xlim(-1.2, 2.2)
ax3d.set_ylim(-2.2, 2.2)
ax3d.set_zlim(-0.2, 2.2)

# [右子图]: 2D 平面展开
ax2d = fig.add_axes([0.55, 0.22, 0.40, 0.68])
ax2d.set_facecolor(MORANDI['bg'])
ax2d.set_aspect('equal')
ax2d.spines['top'].set_visible(False)
ax2d.spines['right'].set_visible(False)
ax2d.spines['left'].set_color(MORANDI['line_aux'])
ax2d.spines['bottom'].set_color(MORANDI['line_aux'])
ax2d.tick_params(colors=MORANDI['line_main'])
ax2d.grid(True, linestyle='--', color=MORANDI['line_aux'], linewidth=0.5)
ax2d.set_xlim(-1.5, 2.5)
ax2d.set_ylim(-2.5, 2.5)

# --- 3D 部分静态绘制 ---
# 静态底面 ABCD
poly_base = Poly3DCollection([[A_val, B_val, C_val, np.array([2.0, 2.0, 0.0])]], 
                             facecolors=MORANDI['face_base'], alpha=0.4, edgecolors=MORANDI['line_aux'], linewidths=0.8)
ax3d.add_collection3d(poly_base)

# 原始阳马框架 (虚线)
pyramid_edges = [
    (A_val, np.array([0, 2, 1])),
    (B_val, np.array([0, 2, 1])),
    (C_val, np.array([0, 2, 1])),
    (np.array([2, 2, 0]), np.array([0, 2, 1])),
]
for p1, p2 in pyramid_edges:
    ax3d.plot([p1[0], p2[0]], [p1[1], p2[1]], [p1[2], p2[2]], color=MORANDI['line_aux'], ls=':', lw=0.8)

# 3D 动态面定义
poly_pab = Poly3DCollection([], facecolors=MORANDI['face_fold1'], alpha=0.5, edgecolors=MORANDI['line_main'], linewidths=1)
poly_dbc = Poly3DCollection([], facecolors=MORANDI['face_fold2'], alpha=0.4, edgecolors=MORANDI['line_main'], linewidths=1)
ax3d.add_collection3d(poly_pab)
ax3d.add_collection3d(poly_dbc)

# 3D 动态线条与点
line_3d_fold, = ax3d.plot([], [], [], color=MORANDI['line_highlight'], lw=2.2, zorder=10)
line_p_track, = ax3d.plot([], [], [], color=MORANDI['line_optimal'], ls='--', lw=1.0)
line_d_track, = ax3d.plot([], [], [], color=MORANDI['line_optimal'], ls='--', lw=1.0)

dots_3d = ax3d.scatter([], [], [], color=MORANDI['line_highlight'], s=25, zorder=12)

# 3D 文本标注
txt_P = ax3d.text(0, 0, 0, r"$P$", fontsize=12, color=MORANDI['text'])
txt_D = ax3d.text(0, 0, 0, r"$D$", fontsize=12, color=MORANDI['text'])
ax3d.text(A_val[0], A_val[1]-0.1, A_val[2], r"$A$", fontsize=11, color=MORANDI['text'])
ax3d.text(B_val[0]-0.1, B_val[1]-0.1, B_val[2], r"$B$", fontsize=11, color=MORANDI['text'])
ax3d.text(C_val[0]+0.1, C_val[1]-0.1, C_val[2], r"$C$", fontsize=11, color=MORANDI['text'])
txt_E_3d = ax3d.text(0, 0, 0, r"$E$", fontsize=11, color=MORANDI['line_highlight'])
txt_F_3d = ax3d.text(0, 0, 0, r"$F$", fontsize=11, color=MORANDI['line_highlight'])

# --- 2D 部分静态绘制 ---
# 绘制底面矩形 ABCD 边界
rect_x = [0, 2, 2, 0, 0]
rect_y = [2, 2, 0, 0, 2]
ax2d.plot(rect_x, rect_y, color=MORANDI['line_aux'], ls='--', lw=1.2, label="底面矩形")

# 绘制最优直虚线 P'D'
ax2d.plot([-1, 2], [2, -2], color=MORANDI['line_optimal'], ls='--', lw=1.2, label="理论最短路径")

# 2D 动态折线与点
line_2d_fold, = ax2d.plot([], [], color=MORANDI['line_highlight'], lw=2.2, marker='o', ms=5, zorder=5)
dot_p_prime, = ax2d.plot([], [], 'o', color=MORANDI['line_optimal'], ms=6)
dot_d_prime, = ax2d.plot([], [], 'o', color=MORANDI['line_optimal'], ms=6)

# 2D 文本标注
ax2d.text(-0.2, 2.1, r"$A(0,2)$", color=MORANDI['text'])
ax2d.text(-0.4, -0.3, r"$B(0,0)$", color=MORANDI['text'])
ax2d.text(2.1, -0.2, r"$C(2,0)$", color=MORANDI['text'])
ax2d.text(2.1, 2.1, r"$D(2,2)$", color=MORANDI['text'])
txt_p_prime = ax2d.text(0, 0, "", color=MORANDI['line_optimal'], fontweight='bold')
txt_d_prime = ax2d.text(0, 0, "", color=MORANDI['line_optimal'], fontweight='bold')
txt_E_2d = ax2d.text(0, 0, "", color=MORANDI['line_highlight'])
txt_F_2d = ax2d.text(0, 0, "", color=MORANDI['line_highlight'])

# 页面标题与数学信息展示
ax3d.text2D(0.05, 0.95, "阳马折线最值模型 (空间双重展开)", transform=ax3d.transAxes, fontsize=14, fontweight='bold', color=MORANDI['text'])
info_text = ax2d.text(-1.3, -2.2, "", fontsize=10, bbox=dict(facecolor='white', alpha=0.8, edgecolor=MORANDI['line_aux']))

# --- 交互控件布局 ---
ax_slider_t = fig.add_axes([0.12, 0.08, 0.30, 0.025], facecolor=MORANDI['bg'])
ax_slider_e = fig.add_axes([0.55, 0.08, 0.15, 0.025], facecolor=MORANDI['bg'])
ax_slider_f = fig.add_axes([0.75, 0.08, 0.15, 0.025], facecolor=MORANDI['bg'])
ax_btn = fig.add_axes([0.92, 0.07, 0.05, 0.04], facecolor=MORANDI['bg'])

slider_t = Slider(ax_slider_t, '展开进度', 0.0, 1.0, valinit=0.0, color=MORANDI['line_optimal'])
slider_e = Slider(ax_slider_e, 'E点坐标', 0.0, 2.0, valinit=0.6, color=MORANDI['line_highlight'])
slider_f = Slider(ax_slider_f, 'F点坐标', 0.0, 2.0, valinit=1.4, color=MORANDI['line_highlight'])
btn_opt = Button(ax_btn, '最值', color='white', hovercolor='#F1F6F6')

# 去除滑块轴线以保证美观
for ax in [ax_slider_t, ax_slider_e, ax_slider_f]:
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_xticks([])
    ax.set_yticks([])

# --- 更新逻辑 ---
def update(val):
    t = slider_t.val
    y_E = slider_e.val
    x_F = slider_f.val
    
    # 1. 计算三维坐标
    P_t = get_P_t(t)
    D_t = get_D_t(t)
    E_t = np.array([0.0, y_E, 0.0])
    F_t = np.array([x_F, 0.0, 0.0])
    
    # 2. 更新 3D 图形
    poly_pab.set_verts([[P_t, A_val, B_val]])
    poly_dbc.set_verts([[D_t, B_val, C_val]])
    
    # 绘制空间折线 P(t) -> E -> F -> D(t)
    xs = [P_t[0], E_t[0], F_t[0], D_t[0]]
    ys = [P_t[1], E_t[1], F_t[1], D_t[1]]
    zs = [P_t[2], E_t[2], F_t[2], D_t[2]]
    line_3d_fold.set_data(xs, ys)
    line_3d_fold.set_3d_properties(zs)
    
    # 绘制翻折圆弧轨迹
    t_space = np.linspace(0, t, 30)
    p_tr = np.array([get_P_t(ti) for ti in t_space])
    d_tr = np.array([get_D_t(ti) for ti in t_space])
    line_p_track.set_data(p_tr[:, 0], p_tr[:, 1])
    line_p_track.set_3d_properties(p_tr[:, 2])
    line_d_track.set_data(d_tr[:, 0], d_tr[:, 1])
    line_d_track.set_3d_properties(d_tr[:, 2])
    
    # 更新散点和文本
    dots_3d._offsets3d = (xs, ys, zs)
    txt_P.set_position_3d(P_t + np.array([-0.1, 0.1, 0.1]))
    txt_D.set_position_3d(D_t + np.array([0.1, 0.1, 0.1]))
    txt_E_3d.set_position_3d(E_t + np.array([-0.2, 0.0, 0.1]))
    txt_F_3d.set_position_3d(F_t + np.array([0.0, -0.2, 0.1]))
    
    # 3. 更新 2D 图形
    P_2d = np.array([-1.0, 2.0])
    D_2d = np.array([2.0, -2.0])
    
    # 折线: P' -> E -> F -> D'
    line_2d_fold.set_data([P_2d[0], 0, x_F, D_2d[0]], [P_2d[1], y_E, 0, D_2d[1]])
    
    # 动画过程中，P' 和 D' 对应的点逐渐显现或淡入 (这里直接显示终点)
    dot_p_prime.set_data([P_2d[0]], [P_2d[1]])
    dot_d_prime.set_data([D_2d[0]], [D_2d[1]])
    
    txt_p_prime.set_position((P_2d[0]-0.5, P_2d[1]-0.1))
    txt_p_prime.set_text(r"$P'(-1,2)$")
    txt_d_prime.set_position((D_2d[0]+0.1, D_2d[1]-0.1))
    txt_d_prime.set_text(r"$D'(2,-2)$")
    
    txt_E_2d.set_position((0.1, y_E+0.05))
    txt_E_2d.set_text(f"$E(0, {y_E:.2f})$")
    txt_F_2d.set_position((x_F-0.2, -0.35))
    txt_F_2d.set_text(f"$F({x_F:.2f}, 0)$")
    
    # 4. 计算实时长度与显示
    dist_PE = np.linalg.norm(P_2d - np.array([0.0, y_E]))
    dist_EF = np.linalg.norm(np.array([0.0, y_E]) - np.array([x_F, 0.0]))
    dist_FD = np.linalg.norm(np.array([x_F, 0.0]) - D_2d)
    current_fold_len = dist_PE + dist_EF + dist_FD
    
    fixed_PD = np.sqrt(5.0) # PD = sqrt(1^2 + 2^2) = sqrt(5)
    total_len = current_fold_len + fixed_PD
    
    info_text.set_text(
        f"定长边 $PD = \\sqrt{{5}} \\approx {fixed_PD:.3f}$\n"
        f"当前动折线 $PE+EF+FD = {current_fold_len:.3f}$\n"
        f"当前总周长 $L = {total_len:.3f}$\n"
        f"理论最小周长 $L_{{min}} = 5 + \\sqrt{{5}} \\approx 7.236$"
    )
    
    fig.canvas.draw_idle()

# 最值一键复位
def reset_to_optimal(event):
    slider_e.set_val(2.0/3.0)
    slider_f.set_val(1.0)
    slider_t.set_val(1.0)

# 绑定事件
slider_t.on_changed(update)
slider_e.on_changed(update)
slider_f.on_changed(update)
btn_opt.on_clicked(reset_to_optimal)

# 初始化状态
update(None)

plt.show()