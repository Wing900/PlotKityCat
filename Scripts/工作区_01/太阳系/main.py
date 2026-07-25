import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Slider, Button, CheckButtons

# 默认抗锯齿与字体配置
mpl.rcParams['lines.antialiased'] = True
mpl.rcParams['patch.antialiased'] = True
plt.rcParams.update({
    "font.family": "SimHei",
    "mathtext.fontset": "cm",
    "axes.unicode_minus": False,
    "font.size": 11
})

# 精确调配的马卡龙莫兰迪浅色系
MORANDI = {
    'bg': '#FAF8F5',         # 暖黄浅底色
    'text': '#4A4A4A',       # 灰黑色文字
    'orbit': '#CCD5DB',      # 辅助灰蓝轨道线
    'sun': '#EBC29B',        # 柔和暖橙太阳
    'mercury': '#B6C8D4',    # 粉蓝灰水星
    'venus': '#EAD1C3',      # 莫兰迪粉橘金星
    'earth': '#A9C9D6',      # 浅绿蓝地球
    'mars': '#DFB5B2',       # 浅粉红火星
    'jupiter': '#DECFA4',    # 浅粉黄木星
    'asteroid': '#D5DFE2',   # 小行星带淡灰
}

# 倾斜投影比例因子（产生斜侧视的3D透视感）
tilt = 0.35

# 太阳系天体代数与轨道参数配置（R: 轨道半长轴, omega: 相对角速度）
PLANETS = [
    {'name': '水星', 'R': 1.1, 'omega': 3.2, 'color': MORANDI['mercury'], 'size': 6},
    {'name': '金星', 'R': 1.7, 'omega': 1.6, 'color': MORANDI['venus'], 'size': 9},
    {'name': '地球', 'R': 2.4, 'omega': 1.0, 'color': MORANDI['earth'], 'size': 10},
    {'name': '火星', 'R': 3.1, 'omega': 0.6, 'color': MORANDI['mars'], 'size': 8},
    {'name': '木星', 'R': 4.1, 'omega': 0.25, 'color': MORANDI['jupiter'], 'size': 14},
]

# 初始化画布
fig = plt.figure(figsize=(10.5, 6.5), facecolor=MORANDI['bg'])

# [主视图空间]
ax = fig.add_axes([0.02, 0.12, 0.72, 0.82])
ax.set_facecolor(MORANDI['bg'])
ax.set_xlim(-5.0, 5.0)
ax.set_ylim(-2.1, 2.1)
ax.set_aspect('equal')
ax.axis('off')

# 1. 绘制太阳多层晕光
for r_glow, alpha in zip([0.16, 0.28, 0.42], [0.8, 0.35, 0.12]):
    ax.add_patch(plt.Circle((0, 0), r_glow, color=MORANDI['sun'], alpha=alpha, zorder=3))

# 2. 绘制背景星盘精细刻度环
ticks_x = []
ticks_y = []
for th in np.linspace(0, 2 * np.pi, 96, endpoint=False):
    ticks_x.extend([4.8 * np.cos(th), 4.72 * np.cos(th), None])
    ticks_y.extend([4.8 * tilt * np.sin(th), 4.72 * tilt * np.sin(th), None])
ax.plot(ticks_x, ticks_y, color=MORANDI['orbit'], lw=0.6, alpha=0.8, zorder=0)

theta_orbit = np.linspace(0, 2 * np.pi, 250)
ax.plot(4.8 * np.cos(theta_orbit), 4.8 * tilt * np.sin(theta_orbit), color=MORANDI['orbit'], lw=0.8, alpha=0.5, zorder=0)

# 3. 生成小行星带分布（介于火星与木星轨道之间）
np.random.seed(101)
num_asteroids = 160
ast_r = np.random.uniform(3.4, 3.7, num_asteroids)
ast_theta = np.random.uniform(0, 2 * np.pi, num_asteroids)
ast_x = ast_r * np.cos(ast_theta)
ast_y = tilt * ast_r * np.sin(ast_theta)
ax.scatter(ast_x, ast_y, s=1.2, color=MORANDI['asteroid'], alpha=0.7, zorder=1)

# 4. 实例天体轨道与定位点
orbit_lines = []
planet_dots = []

for p in PLANETS:
    # 投影后的椭圆轨道线
    x_o = p['R'] * np.cos(theta_orbit)
    y_o = tilt * p['R'] * np.sin(theta_orbit)
    line, = ax.plot(x_o, y_o, color=MORANDI['orbit'], lw=0.8, ls='--', alpha=0.6, zorder=1)
    orbit_lines.append(line)

    # 行星实体点
    dot, = ax.plot([], [], 'o', color=p['color'], ms=p['size'], zorder=4)
    planet_dots.append(dot)

# 5. 单独建立月球运动实体
moon_dot, = ax.plot([], [], 'o', color='#AEB9BF', ms=3, zorder=5)
moon_orbit, = ax.plot([], [], color=MORANDI['orbit'], lw=0.4, ls=':', alpha=0.6, zorder=2)

# 状态管理
state = {
    't': 0.0,
    'speed': 1.0,
    'is_running': True,
    'visible': [True] * len(PLANETS)
}

# 顶层标题
ax.text(0, 1.95, "太阳系多星体轨道运行投影系统", ha='center', va='center', fontsize=14, color=MORANDI['text'])

# [交互组件空间布局]
ax_chk = fig.add_axes([0.76, 0.32, 0.20, 0.45], facecolor=MORANDI['bg'])
ax_chk.set_axis_off()

ax_slider = fig.add_axes([0.12, 0.06, 0.42, 0.03], facecolor=MORANDI['bg'])
ax_btn = fig.add_axes([0.58, 0.05, 0.11, 0.05], facecolor=MORANDI['bg'])

# 6. 配置多维状态复选框
chk = CheckButtons(
    ax=ax_chk,
    labels=[p['name'] for p in PLANETS],
    actives=[True] * len(PLANETS),
    label_props={
        'color': [MORANDI['text']] * len(PLANETS),
    },
    frame_props={
        'edgecolor': [MORANDI['orbit']] * len(PLANETS),
        'facecolor': ['white'] * len(PLANETS),
        'linewidth': [0.8] * len(PLANETS),
        's': [45] * len(PLANETS),
    },
    check_props={
        'facecolor': [p['color'] for p in PLANETS],
        'linewidth': [1.0] * len(PLANETS),
        's': [45] * len(PLANETS),
    }
)

for spine in ax_chk.spines.values():
    spine.set_visible(False)

# 7. 配置时间流速滑块
slider = Slider(
    ax=ax_slider,
    label='运行速度',
    valmin=0.0,
    valmax=3.0,
    valinit=1.0,
    valfmt='%1.1fx',
    color=MORANDI['mercury'],
    track_color='#E8EEEE',
    initcolor='none',
    handle_style={
        'facecolor': MORANDI['text'],
        'edgecolor': 'white',
        'size': 10
    }
)
for spine in ax_slider.spines.values():
    spine.set_visible(False)
ax_slider.set_xticks([])
ax_slider.set_yticks([])
slider.label.set_color(MORANDI['text'])
slider.valtext.set_color(MORANDI['text'])

# 8. 配置启停按钮
btn = Button(ax_btn, '暂停', color='white', hovercolor='#F1F6F6')
for spine in ax_btn.spines.values():
    spine.set_color(MORANDI['orbit'])
    spine.set_linewidth(0.8)
btn.label.set_color(MORANDI['text'])


# 核心坐标更新函数
def update_positions(t_val):
    for i, p in enumerate(PLANETS):
        if state['visible'][i]:
            angle = p['omega'] * t_val
            x = p['R'] * np.cos(angle)
            y = tilt * p['R'] * np.sin(angle)
            planet_dots[i].set_data([x], [y])
            planet_dots[i].set_visible(True)
            orbit_lines[i].set_visible(True)
        else:
            planet_dots[i].set_visible(False)
            orbit_lines[i].set_visible(False)

    # 单独处理地月子系统的代数坐标关联 (Earth index = 2)
    if state['visible'][2]:
        earth_angle = PLANETS[2]['omega'] * t_val
        x_e = PLANETS[2]['R'] * np.cos(earth_angle)
        y_e = tilt * PLANETS[2]['R'] * np.sin(earth_angle)

        # 月球绕地轨道半径与其相对极高频角速度
        r_m = 0.22
        moon_angle = 12.0 * earth_angle
        x_m = x_e + r_m * np.cos(moon_angle)
        y_m = y_e + tilt * r_m * np.sin(moon_angle)

        moon_dot.set_data([x_m], [y_m])
        moon_dot.set_visible(True)

        # 实时生成并投射月球运行微轨
        x_mo = x_e + r_m * np.cos(theta_orbit)
        y_mo = y_e + tilt * r_m * np.sin(theta_orbit)
        moon_orbit.set_data(x_mo, y_mo)
        moon_orbit.set_visible(True)
    else:
        moon_dot.set_visible(False)
        moon_orbit.set_visible(False)


# 9. 注册回调函数与状态驱动
def animate(frame):
    if state['is_running']:
        state['t'] += 0.02 * state['speed']
        update_positions(state['t'])
    return planet_dots + [moon_dot, moon_orbit] + orbit_lines


def on_slider_change(val):
    state['speed'] = val


def on_check_clicked(label):
    for i, p in enumerate(PLANETS):
        if p['name'] == label:
            state['visible'][i] = not state['visible'][i]
    update_positions(state['t'])
    fig.canvas.draw_idle()


def on_button_clicked(event):
    state['is_running'] = not state['is_running']
    btn.label.set_text('播放' if not state['is_running'] else '暂停')
    fig.canvas.draw_idle()


slider.on_changed(on_slider_change)
chk.on_clicked(on_check_clicked)
btn.on_clicked(on_button_clicked)

# 启动平滑动画
ani = FuncAnimation(fig, animate, interval=25, blit=False)

plt.show()