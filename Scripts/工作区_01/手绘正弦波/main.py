import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np

# 1. 启用手绘草图风格 (XKCD 风格)
plt.xkcd(scale=1, length=100, randomness=2)

plt.rcParams.update({
    "font.family": "sans-serif",
    "mathtext.fontset": "cm",
    "font.size": 11
})

# 莫兰迪粉彩配色
MORANDI = {
    'bg': '#FAF8F5',         # 暖黄底色
    'text': '#3A3A3A',       # 灰黑主文字
    'line': '#5F6466',       # 轴线与主要边框
    'circle_fill': '#A9C9D6',# 莫兰迪浅蓝 (圆盘)
    'wave_fill': '#DFB5B2',  # 莫兰迪浅粉 (正弦波填充)
    'aux_dash': '#CCD5DB'    # 辅助投影虚线
}

# 2. 初始化画布与轴线
fig = plt.figure(figsize=(9.5, 4.8), facecolor=MORANDI['bg'])
ax = fig.add_axes([0.02, 0.02, 0.96, 0.96])
ax.set_facecolor(MORANDI['bg'])
ax.set_xlim(-3.5, 6.8)
ax.set_ylim(-1.5, 1.8)
ax.set_aspect('equal')  # 严格保证圆与波形的几何比例
ax.axis('off')

# 3. 几何参数解算
theta = 1.18            # 设定当前观测的旋转角 (约 67.6 度)
cx, cy = -2.0, 0.0      # 单位圆中心坐标
r = 1.0                 # 单位圆半径

# 4. 绘制底图参考坐标系 (手绘风)
ax.plot([-3.2, -0.8], [0, 0], color=MORANDI['aux_dash'], lw=1.0, ls=':', zorder=0)
ax.plot([-2.0, -2.0], [-1.2, 1.2], color=MORANDI['aux_dash'], lw=1.0, ls=':', zorder=0)
ax.plot([-0.2, 6.5], [0, 0], color=MORANDI['line'], lw=1.2, zorder=1) # 波动轴线
ax.plot([0, 0], [-1.2, 1.2], color=MORANDI['line'], lw=1.2, zorder=1) # 波动y轴

# 5. 绘制单位圆上的扇形区域
t_wedge = np.linspace(0, theta, 100)
x_w = np.concatenate([[cx], cx + r * np.cos(t_wedge), [cx]])
y_w = np.concatenate([[cy], cy + r * np.sin(t_wedge), [cy]])
ax.fill(x_w, y_w, color=MORANDI['circle_fill'], alpha=0.45, zorder=1)
ax.plot(cx + r * np.cos(t_wedge), cy + r * np.sin(t_wedge), color=MORANDI['line'], lw=1.8, zorder=2)

# 绘制完整的圆弧背景
t_full = np.linspace(0, 2 * np.pi, 200)
ax.plot(cx + r * np.cos(t_full), cy + r * np.sin(t_full), color=MORANDI['line'], lw=1.0, ls='--', alpha=0.5, zorder=1)

# 6. 绘制正弦波波形
x_wave = np.linspace(0, 2 * np.pi, 250)
y_wave = np.sin(x_wave)
ax.plot(x_wave, y_wave, color=MORANDI['line'], lw=1.8, zorder=2)

# 填充正弦波对应区间
x_fill = np.linspace(0, theta, 150)
ax.fill_between(x_fill, 0, np.sin(x_fill), color=MORANDI['wave_fill'], alpha=0.45, zorder=1)

# 7. 解算关键投影点
px, py = cx + r * np.cos(theta), r * np.sin(theta)  # 圆上旋转质点 P
qx, qy = theta, np.sin(theta)                      # 波形对应投影点 Q

# 绘制旋转矢量半径与质点
ax.plot([cx, px], [cy, py], color=MORANDI['line'], lw=2.0, zorder=3)
ax.plot([px], [py], 'o', color=MORANDI['line'], ms=8, zorder=4)
ax.plot([qx], [qy], 'o', color=MORANDI['line'], ms=8, zorder=4)

# 绘制跨越空间的主投影虚线 (点 P 投影至点 Q)
ax.plot([px, qx], [py, qy], color=MORANDI['line'], lw=1.2, ls=':', alpha=0.8, zorder=3)

# 8. 极简英文标注
ax.text(1.5, 1.4, "How a Sine Wave is Born", fontsize=14, color=MORANDI['text'], weight='bold', ha='center')
ax.text(cx, -1.3, "Unit Circle", fontsize=10.5, color=MORANDI['text'], ha='center')
ax.text(3.14, -1.3, "Sine Wave", fontsize=10.5, color=MORANDI['text'], ha='center')

# 极小几何符号
ax.text(cx + 0.3 * np.cos(theta/2), cy + 0.25 * np.sin(theta/2), r"$\theta$", fontsize=11, color=MORANDI['text'], ha='center')
ax.text(qx + 0.1, qy + 0.1, r"$y = \sin\theta$", fontsize=10.5, color=MORANDI['text'], ha='left')

plt.show()