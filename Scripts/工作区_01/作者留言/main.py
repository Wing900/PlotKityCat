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

# 精致的莫兰迪色表
MORANDI = {
    'bg': '#FAF8F5',         # 温暖黄白底色
    'text_dark': '#2D2D2D',  # 主标/正文深灰
    'text_muted': '#5F6466', # 辅助正文灰
    'accent_pink': '#EAD1C3',# 脏粉色（大字报强调色）
    'accent_blue': '#A9C9D6',# 灰蓝色
    'panel_blue': '#EEF4F6', # 灰蓝轻量面板底色
    'panel_beige': '#F5EFE8',# 浅沙色轻量面板底色
    'grid': '#E5EAEB'        # 背景弱格栅
}

# 建立 10x15 的高比例海报画布
fig = plt.figure(figsize=(10, 15), facecolor=MORANDI['bg'])
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, 10)
ax.set_ylim(0, 15)
ax.axis('off')

# ==========================================
# 1. 绘制背景数学艺术水印（呼应“看见数学”）
# ==========================================
# (a) 顶部：抽象的利萨茹共振曲线水印
t_l = np.linspace(0, 2 * np.pi, 500)
x_l = 8.0 + 1.2 * np.sin(3 * t_l)
y_l = 13.5 + 0.8 * np.sin(4 * t_l)
ax.plot(x_l, y_l, color=MORANDI['accent_blue'], lw=1.2, alpha=0.35, zorder=0)

# (b) 底部：黄金对数螺旋线水印
theta = np.linspace(0, 5 * np.pi, 800)
r = 0.08 * np.exp(0.18 * theta)
x_spiral = 1.2 + r * np.cos(theta)
y_spiral = 2.0 + r * np.sin(theta)
ax.plot(x_spiral, y_spiral, color=MORANDI['accent_pink'], lw=1.2, alpha=0.35, zorder=0)

# (c) 极淡的底框设计格栅线
for gx in np.linspace(0.5, 9.5, 10):
    ax.axvline(gx, color=MORANDI['grid'], lw=0.5, ls=':', zorder=0)
for gy in np.linspace(0.5, 14.5, 15):
    ax.axhline(gy, color=MORANDI['grid'], lw=0.5, ls=':', zorder=0)


# ==========================================
# 2. 段落排版辅助函数（支持自动换行与段落控制）
# ==========================================
def draw_block_text(ax, lines, x, y_start, spacing=0.36, fontsize=11, color=MORANDI['text_muted'], fontweight='normal'):
    curr_y = y_start
    for line in lines:
        ax.text(x, curr_y, line, fontsize=fontsize, color=color, weight=fontweight, va='top', ha='left')
        curr_y -= spacing
    return curr_y


# ==========================================
# 3. 大字报正文海报内容排版
# ==========================================

# --- 顶层海报标题区域 ---
ax.text(0.8, 14.2, "PLOTKITYCAT  ·  MATH VISUALIZATION", fontsize=10, color=MORANDI['accent_blue'], weight='bold', ha='left')
ax.text(0.8, 13.6, "看见数学 · 教室之旅", fontsize=24, color=MORANDI['text_dark'], weight='bold', ha='left')
ax.plot([0.8, 9.2], [13.2, 13.2], color=MORANDI['text_dark'], lw=2, zorder=1)

# --- 模块一：后续发展 ---
ax.text(0.8, 12.6, "后续发展", fontsize=13, color=MORANDI['text_dark'], weight='bold', ha='left')

# 重磅口号面板（脏粉色双层立体色块）
rect_bg1 = plt.Rectangle((0.75, 11.25), 8.5, 0.95, facecolor=MORANDI['accent_pink'], alpha=0.4, edgecolor='none', zorder=1)
rect_bg2 = plt.Rectangle((0.8, 11.3), 8.4, 0.9, facecolor=MORANDI['accent_pink'], edgecolor='none', zorder=2)
ax.add_patch(rect_bg1)
ax.add_patch(rect_bg2)

ax.text(1.2, 11.75, "我们永远只会做一件事，", fontsize=15, color=MORANDI['text_dark'], weight='bold', zorder=3)
ax.text(1.2, 11.45, "把看见数学带到教室去！", fontsize=15, color=MORANDI['text_dark'], weight='bold', zorder=3)

# --- 模块二：如何设计可视化场景是我们未来要研究的课题 ---
ax.text(0.8, 10.6, "如何设计可视化场景是我们未来要研究的课题", fontsize=13, color=MORANDI['text_dark'], weight='bold', ha='left')

# 灰蓝轻量内容面板
rect_p1 = plt.Rectangle((0.8, 5.7), 8.4, 4.5, facecolor=MORANDI['panel_blue'], edgecolor='none', alpha=0.9, zorder=1)
ax.add_patch(rect_p1)

lines_p1 = [
    "在AI加持的PlotKityCat中，代码不重要，AI训练了成千上万的Matplotlib",
    "代码，它们绘图的技术远高于百分之90的Matplotlib学习者——你大可不",
    "必担心AI写不出你想要的代码，而是该好好想想如何清楚地表达明白。",
    "",
    "技术是术，长期以来的数学可视化中，几何画板和GGB等软件解决的是",
    "“用什么来可视化的问题”，这些就是术的问题。但如今在PlotKityCat",
    "中，这些问题被解决了。",
    "",
    "让我们转向道的探索吧！怎么样的可视化场景更符合学生的认知？怎么样",
    "的互动更能引起学生爬梯子的学习欲望？我相信这将会大有可为！",
    "",
    "如果你不擅长设计，欢迎加入相关社群，作者会分享自己的可视化理论来",
    "共同交流！"
]
draw_block_text(ax, lines_p1, 1.1, 9.9, spacing=0.33, fontsize=10.5, color=MORANDI['text_muted'])

# --- 模块三：作者联系方式与开源信念 ---
ax.text(0.8, 5.0, "作者联系方式 & 独立承诺", fontsize=13, color=MORANDI['text_dark'], weight='bold', ha='left')

# 浅沙色暖意内容面板
rect_p2 = plt.Rectangle((0.8, 1.2), 8.4, 3.4, facecolor=MORANDI['panel_beige'], edgecolor='none', alpha=0.9, zorder=1)
ax.add_patch(rect_p2)

# 联系邮箱单独加粗高亮
ax.text(1.1, 4.25, "邮箱：wingflow@qq.com", fontsize=11, color=MORANDI['text_dark'], weight='bold', zorder=2)

lines_p2 = [
    "作为一个独立开发者，接受商务合作，可以有偿提供技术解决方案。",
    "",
    "此外，无论您是否付费AI订阅，作者向您保证：不会阉割软件功能，不会",
    "增加广告。您的使用就已经是对本软件的最大支持，我不靠这个吃饭！您",
    "随时可以进我们的社群进行交流，寻求软件帮助——在保持礼貌的情况下。",
    "",
    "如果软件帮助到了您，很欢迎在社群中分享您的使用经验，本软件并无赞",
    "助入口，您的分享就是最好的赞助。"
]
draw_block_text(ax, lines_p2, 1.1, 3.9, spacing=0.31, fontsize=10, color=MORANDI['text_muted'])

# --- 页脚标志 ---
ax.text(5.0, 0.7, "Designed on PlotKityCat  ·  Matplotlib Engine", fontsize=9, color=MORANDI['text_muted'], alpha=0.6, ha='center')

plt.show()