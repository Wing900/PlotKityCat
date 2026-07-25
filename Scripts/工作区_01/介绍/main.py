import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np

# 默认抗锯齿与排版字体配置
mpl.rcParams['lines.antialiased'] = True
mpl.rcParams['patch.antialiased'] = True
plt.rcParams.update({
    "font.family": "SimHei",
    "mathtext.fontset": "cm",
    "axes.unicode_minus": False,
    "font.size": 11
})

# 莫兰迪粉彩星系色彩
MORANDI = {
    'bg': '#FAF8F5',         # 暖黄浅底底色
    'text_dark': '#2D2D2D',  # 主标/正文深灰
    'text_muted': '#5F6466', # 辅助正文灰
    'cloud_blue': '#E5EDF1', # 极淡莫兰迪蓝（主云）
    'cloud_pink': '#F6ECE6', # 极淡莫兰迪粉（左云）
    'cloud_green': '#E8F0EB',# 极淡莫兰迪绿（右云）
    'panel_beige': '#FAF3EC',# 浅沙色面板底色
    'breeze_blue': '#C3D1D6',# 微风灰蓝线
    'breeze_pink': '#DFB5B2' # 微风粉线
}

# 建立 10x12 竖版精致海报
fig = plt.figure(figsize=(9, 11), facecolor=MORANDI['bg'])
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 10)
ax.set_ylim(0, 12)
ax.axis('off')


# ==========================================
# 1. 矢量数学云朵绘制函数 (代数图形合并)
# ==========================================
def draw_vector_cloud(ax, cx, cy, rx, ry, color, alpha=1.0, zorder=2):
    """通过多点圆包络与矩形拼接，解算出平滑的卡通云朵"""
    offsets = [
        (-0.5 * rx, -0.05 * ry, 0.55 * ry),
        (0.5 * rx, -0.05 * ry, 0.55 * ry),
        (-0.2 * rx, 0.25 * ry, 0.75 * ry),
        (0.2 * rx, 0.20 * ry, 0.75 * ry),
        (0.0 * rx, -0.15 * ry, 0.60 * ry)
    ]
    for dx, dy, r in offsets:
        circle = plt.Circle((cx + dx, cy + dy), r, color=color, alpha=alpha, zorder=zorder)
        ax.add_patch(circle)
    # 填充中间空隙的矩形
    rect = plt.Rectangle((cx - 0.5 * rx, cy - 0.3 * ry), 1.0 * rx, 0.5 * ry, color=color, alpha=alpha, zorder=zorder)
    ax.add_patch(rect)


# ==========================================
# 2. 绘制承载云朵的“数学之风”（正弦干涉曲线）
# ==========================================
x_w = np.linspace(0.5, 9.5, 300)
y_w1 = 6.2 + 0.35 * np.sin(0.7 * x_w + 0.5)
ax.plot(x_w, y_w1, color=MORANDI['breeze_blue'], lw=1.0, ls='--', alpha=0.5, zorder=1)

y_w2 = 5.9 + 0.30 * np.sin(0.7 * x_w - 0.8)
ax.plot(x_w, y_w2, color=MORANDI['breeze_pink'], lw=0.8, ls=':', alpha=0.5, zorder=1)


# ==========================================
# 3. 绘制三朵漂浮的数学云
# ==========================================
# (A) 主云朵（蓝灰色）
draw_vector_cloud(ax, cx=5.0, cy=8.4, rx=3.2, ry=1.1, color=MORANDI['cloud_blue'], alpha=0.9, zorder=2)

# (B) 左侧云朵（淡粉色）
draw_vector_cloud(ax, cx=2.5, cy=5.1, rx=2.1, ry=0.85, color=MORANDI['cloud_pink'], alpha=0.9, zorder=2)

# (C) 右侧云朵（淡绿色）
draw_vector_cloud(ax, cx=7.5, cy=5.1, rx=2.1, ry=0.85, color=MORANDI['cloud_green'], alpha=0.9, zorder=2)


# ==========================================
# 4. 精确文字排版布局 (提炼关键信息)
# ==========================================

# --- 顶层主标题 ---
ax.text(5.0, 10.8, "P L O T K I T Y C A T", fontsize=18, color=MORANDI['text_dark'], weight='bold', ha='center')
ax.text(5.0, 10.4, "一个为教室互动场景打造的 Matplotlib 编译器", fontsize=11, color=MORANDI['text_muted'], ha='center')
ax.plot([4.0, 6.0], [10.1, 10.1], color=MORANDI['breeze_blue'], lw=1.5)

# --- 主云文本 (Introduce) ---
ax.text(5.0, 8.7, "看见数学 · 教室编译", fontsize=13, color=MORANDI['text_dark'], weight='bold', ha='center', zorder=3)
ax.text(5.0, 8.3, "把复杂的画图过程留给 AI 托管", fontsize=10, color=MORANDI['text_muted'], ha='center', zorder=3)
ax.text(5.0, 7.9, "把最直观的数学互动作品轻易带入课堂", fontsize=10, color=MORANDI['text_muted'], ha='center', zorder=3)

# --- 左云文本 (AI体验) ---
ax.text(2.5, 5.3, "AI 原生体验", fontsize=11, color=MORANDI['text_dark'], weight='bold', ha='center', zorder=3)
ax.text(2.5, 4.9, "教师无须担忧怎么画", fontsize=9.5, color=MORANDI['text_muted'], ha='center', zorder=3)
ax.text(2.5, 4.6, "重心转向“画什么”", fontsize=9.5, color=MORANDI['text_muted'], ha='center', zorder=3)

# --- 右云文本 (互动与美) ---
ax.text(7.5, 5.3, "学生互动交互", fontsize=11, color=MORANDI['text_dark'], weight='bold', ha='center', zorder=3)
ax.text(7.5, 4.9, "超越静态图片与动画", fontsize=9.5, color=MORANDI['text_muted'], ha='center', zorder=3)
ax.text(7.5, 4.6, "保留最纯粹的数学之美", fontsize=9.5, color=MORANDI['text_muted'], ha='center', zorder=3)


# --- 底部社群与链接面板 ---
rect_p = plt.Rectangle((1.5, 1.4), 7.0, 1.9, facecolor=MORANDI['panel_beige'], edgecolor='none', alpha=0.9, zorder=1)
ax.add_patch(rect_p)

# 教程地址加粗
ax.text(5.0, 2.7, "社群与在线教程：https://tour.5051001.xyz", fontsize=10.5, color=MORANDI['text_dark'], weight='bold', ha='center', zorder=2)
ax.text(5.0, 2.2, "“ 今虽羸弱，而心犹诚。 ”", fontsize=9.5, color=MORANDI['text_muted'], style='italic', ha='center', zorder=2)
ax.text(5.0, 1.7, "欢迎加入 QQ 社群关注最新发布版本", fontsize=9.5, color=MORANDI['text_muted'], ha='center', zorder=2)

# 页脚
ax.text(5.0, 0.7, "Create beautiful stories with PlotKityCat Engine", fontsize=8.5, color=MORANDI['text_muted'], alpha=0.5, ha='center')

plt.show()