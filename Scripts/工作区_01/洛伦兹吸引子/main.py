import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from mpl_toolkits.mplot3d.art3d import Line3DCollection
from matplotlib.widgets import Slider, CheckButtons, Button

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

# 马卡龙/莫兰迪配色方案
MACARON_COLORS = ["#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA"]
BG_COLOR = "#FDFBF7"        # 柔和暖白背景
TEXT_COLOR = "#4A4A4A"      # 深灰文字
PROJ_COLOR = "#D1D5DB"      # 投影线浅灰色
EQUIL_COLOR_1 = "#FF9AA2"   # 稳定点1颜色
EQUIL_COLOR_2 = "#6C88C4"   # 稳定点2颜色

# 创建自定义渐变色板
macaron_cmap = LinearSegmentedColormap.from_list("macaron", MACARON_COLORS, N=256)

# 2. 数学计算：四阶龙格库塔法(RK4)求解洛伦兹方程
def solve_lorenz(rho, max_time=35, dt=0.01):
    num_steps = int(max_time / dt)
    xs = np.zeros(num_steps)
    ys = np.zeros(num_steps)
    zs = np.zeros(num_steps)
    
    # 初始状态微小偏移，引导出混沌轨道
    xs[0], ys[0], zs[0] = (1.0, 1.0, 1.0)
    
    sigma = 10.0
    beta = 8.0 / 3.0
    
    for i in range(num_steps - 1):
        x, y, z = xs[i], ys[i], zs[i]
        
        # RK4 步长计算
        k1_x = sigma * (y - x)
        k1_y = x * (rho - z) - y
        k1_z = x * y - beta * z
        
        x_h1, y_h1, z_h1 = x + 0.5 * dt * k1_x, y + 0.5 * dt * k1_y, z + 0.5 * dt * k1_z
        k2_x = sigma * (y_h1 - x_h1)
        k2_y = x_h1 * (rho - z_h1) - y_h1
        k2_z = x_h1 * y_h1 - beta * z_h1
        
        x_h2, y_h2, z_h2 = x + 0.5 * dt * k2_x, y + 0.5 * dt * k2_y, z + 0.5 * dt * k2_z
        k3_x = sigma * (y_h2 - x_h2)
        k3_y = x_h2 * (rho - z_h2) - y_h2
        k3_z = x_h2 * y_h2 - beta * z_h2
        
        x_e, y_e, z_e = x + dt * k3_x, y + dt * k3_y, z + dt * k3_z
        k4_x = sigma * (y_e - x_e)
        k4_y = x_e * (rho - z_e) - y_e
        k4_z = x_e * y_e - beta * z_e
        
        xs[i+1] = x + (dt/6.0) * (k1_x + 2*k2_x + 2*k3_x + k4_x)
        ys[i+1] = y + (dt/6.0) * (k1_y + 2*k2_y + 2*k3_y + k4_y)
        zs[i+1] = z + (dt/6.0) * (k1_z + 2*k2_z + 2*k3_z + k4_z)
        
    return xs, ys, zs

# 计算平衡点(中心点)
def get_equilibrium_points(rho):
    beta = 8.0 / 3.0
    if rho <= 1:
        return np.array([[0.0, 0.0, 0.0]])
    c = np.sqrt(beta * (rho - 1))
    return np.array([
        [c, c, rho - 1],
        [-c, -c, rho - 1]
    ])

# 3. 初始化画布与三维子图
fig = plt.figure(figsize=(10, 8), facecolor=BG_COLOR)
ax = fig.add_axes([0.05, 0.18, 0.9, 0.78], projection='3d', proj_type='ortho')
ax.set_facecolor(BG_COLOR)

# 设置轴线与网格隐藏，以体现极致简约的现代感
ax.grid(False)
ax.xaxis.line.set_color((1.0, 1.0, 1.0, 0.0))
ax.yaxis.line.set_color((1.0, 1.0, 1.0, 0.0))
ax.zaxis.line.set_color((1.0, 1.0, 1.0, 0.0))
ax.set_xticks([])
ax.set_yticks([])
ax.set_zticks([])

# 初始计算参数
init_rho = 28.0
init_time = 35.0
xs, ys, zs = solve_lorenz(init_rho, init_time)

# 4. 创建绘制对象
# (a) 3D 主轨迹 (使用 Line3DCollection 实现色彩渐变)
points = np.array([xs, ys, zs]).T.reshape(-1, 1, 3)
segments = np.concatenate([points[:-1], points[1:]], axis=1)
lc = Line3DCollection(segments, cmap=macaron_cmap, norm=plt.Normalize(0, len(xs)), linewidth=1.2)
lc.set_array(np.arange(len(xs)))
ax.add_collection3d(lc)

# (b) 底面二维投影面 (增强空间立体度与艺术感)
z_floor = -5.0
proj_line, = ax.plot(xs, ys, np.full_like(zs, z_floor), color=PROJ_COLOR, alpha=0.3, linewidth=0.8)

# (c) 平衡点散点
eq_pts = get_equilibrium_points(init_rho)
eq_scatter = ax.scatter(eq_pts[:, 0], eq_pts[:, 1], eq_pts[:, 2], 
                        c=[EQUIL_COLOR_1, EQUIL_COLOR_2], s=40, edgecolors=TEXT_COLOR, linewidths=0.8, zorder=10)

# (d) 动态端点指针
tip_dot = ax.scatter([xs[-1]], [ys[-1]], [zs[-1]], color="#FF6B6B", s=25, zorder=11)

# 设置视口边界，确保形态变化时不闪烁
ax.set_xlim(-25, 25)
ax.set_ylim(-25, 25)
ax.set_zlim(z_floor, 55)
ax.view_init(elev=20, azim=-45)

# 5. 添加公式与说明文字
ax.text2D(0.05, 0.92, "洛伦兹吸引子 (Lorenz Attractor)\n" + r"$\frac{\mathrm{d}x}{\mathrm{d}t}=\sigma(y-x), \quad \frac{\mathrm{d}y}{\mathrm{d}t}=x(\rho-z)-y, \quad \frac{\mathrm{d}z}{\mathrm{d}t}=xy-\beta z$", 
          transform=ax.transAxes, fontsize=12, color=TEXT_COLOR, ha='left', va='top',
          bbox=dict(boxstyle="round,pad=0.5", facecolor='white', edgecolor='#E5E7EB', alpha=0.8))

# 6. UI 控制组件布局
ax_rho = fig.add_axes([0.15, 0.10, 0.45, 0.022], facecolor='#EAEAEA')
ax_time = fig.add_axes([0.15, 0.05, 0.45, 0.022], facecolor='#EAEAEA')
ax_chk = fig.add_axes([0.68, 0.04, 0.14, 0.09], facecolor=BG_COLOR)
ax_btn = fig.add_axes([0.85, 0.05, 0.08, 0.06], facecolor=BG_COLOR)

# 创建滑块与交互按钮
slider_rho = Slider(ax_rho, r'控制参数 $\rho$', 10.0, 40.0, valinit=init_rho, color="#B5EAD7")
slider_time = Slider(ax_time, r'演化时长 $T$', 5.0, 50.0, valinit=init_time, color="#FFB7B2")

slider_rho.label.set_color(TEXT_COLOR)
slider_time.label.set_color(TEXT_COLOR)

chk_box = CheckButtons(ax_chk, ['显示投影', '显示平衡点'], [True, True])
rects = getattr(chk_box, 'rectangles', [p for p in ax_chk.patches if type(p).__name__ == 'Rectangle'])
for r_patch in rects:
    r_patch.set_edgecolor(TEXT_COLOR)
    r_patch.set_linewidth(0.8)

btn_reset = Button(ax_btn, '重置', color='white', hovercolor='#F5F5F5')
for spine in ax_btn.spines.values():
    spine.set_color('#D1D5DB')
btn_reset.label.set_color(TEXT_COLOR)

# 7. 动态更新逻辑
def update_plot(val):
    rho = slider_rho.val
    max_time = slider_time.val
    
    # 重新求解微分方程
    x_new, y_new, z_new = solve_lorenz(rho, max_time)
    
    # 更新三维主轨道曲线
    pts = np.array([x_new, y_new, z_new]).T.reshape(-1, 1, 3)
    segs = np.concatenate([pts[:-1], pts[1:]], axis=1)
    lc.set_segments(segs)
    lc.set_array(np.arange(len(x_new)))
    
    # 更新动点位置
    tip_dot.set_offsets(np.array([[x_new[-1], y_new[-1]]]))
    tip_dot.set_3d_properties([z_new[-1]], 'z')
    
    # 更新地面投影
    proj_line.set_data(x_new, y_new)
    proj_line.set_3d_properties(np.full_like(z_new, z_floor), 'z')
    
    # 更新平衡点
    eq_pts_new = get_equilibrium_points(rho)
    eq_scatter.set_offsets(eq_pts_new[:, :2])
    eq_scatter.set_3d_properties(eq_pts_new[:, 2], 'z')
    
    fig.canvas.draw_idle()

slider_rho.on_changed(update_plot)
slider_time.on_changed(update_plot)

# 显隐控制逻辑
def toggle_visibility(label):
    status = chk_box.get_status()
    proj_line.set_visible(status[0])
    eq_scatter.set_visible(status[1])
    fig.canvas.draw_idle()

chk_box.on_clicked(toggle_visibility)

# 重置按钮逻辑
def reset_inputs(event):
    slider_rho.reset()
    slider_time.reset()
    if not chk_box.get_status()[0]:
        chk_box.set_active(0)
    if not chk_box.get_status()[1]:
        chk_box.set_active(1)

btn_reset.on_clicked(reset_inputs)

plt.show()