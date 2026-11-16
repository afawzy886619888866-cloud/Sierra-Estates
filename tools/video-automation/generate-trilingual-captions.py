#!/usr/bin/env python3
"""
tools/video-automation/generate-trilingual-captions.py
─────────────────────────────────────────────────────────────────────────────
Generates synchronized trilingual subtitles (Arabic, English, Chinese)
for the Cairo Plaza Real Estate Video Campaign featuring the 20% investor discount.
"""

import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

vo_updated = [
    {
        "shot": 1,
        "time": "00:00 - 00:04",
        "ar": "في قلب المطرية، يبدأ مسار أكثر وضوحاً نحو كايرو بلازا.",
        "en": "In the heart of Matareya, a clearer path to Cairo Plaza begins.",
        "zh": "在马塔里亚市中心，通往开罗广场更清晰的路径就此开启。"
    },
    {
        "shot": 2,
        "time": "00:04 - 00:08",
        "ar": "صور حقيقية ومعلومات موثقة قبل اتخاذ أي قرار.",
        "en": "Real photos and verified information before making any decision.",
        "zh": "做决定之前，先看真实照片和权威核实信息。"
    },
    {
        "shot": 3,
        "time": "00:08 - 00:13",
        "ar": "للمشغلين التجاريين، نراجع المساحات المرجعية في الأبراج 3 و5 و7 قبل أي اتصال أو معاينة.",
        "en": "For commercial operators, we review reference spaces in Towers 3, 5, and 7 before contact or viewing.",
        "zh": "对于商业运营商，我们在联系或实地考察前先审阅3号、5号和7号塔楼的参考空间。"
    },
    {
        "shot": 4,
        "time": "00:13 - 00:18",
        "ar": "وللمستثمرين، خصم حصري يصل إلى 20%، مع نموذج مالي توضيحي وسياق موثق للمشروع.",
        "en": "For investors, an exclusive discount up to 20%, with an illustrative financial model and verified project context.",
        "zh": "对于投资者，独家享受最高达20%的折扣，附带说明性财务模型和已核实项目背景。"
    },
    {
        "shot": 5,
        "time": "00:18 - 00:22",
        "ar": "حدد مسارك واطلب البيانات المناسبة لقرارك.",
        "en": "Choose your track and request the right data for your decision.",
        "zh": "选择您的投资方向，并索取适合您决策的专属资料。"
    },
    {
        "shot": 6,
        "time": "00:22 - 00:27",
        "ar": "اطلب حقيبة المستثمر، أو دليل ملاءمة المشغل التجاري.",
        "en": "Request the Investor Pack, or the Tenant-Fit Brief.",
        "zh": "立即索取《投资者资料包》或《租户适配简报》。"
    },
    {
        "shot": 7,
        "time": "00:27 - 00:30",
        "ar": "Sierra Estates - كايرو بلازا.",
        "en": "Sierra Estates - Cairo Plaza.",
        "zh": "Sierra Estates -- 开罗广场"
    }
]

def generate_srt(output_path="Cairo_Plaza_EN_ZH_Captions_Discount.srt"):
    srt_updated = ""
    for i, item in enumerate(vo_updated, 1):
        t_start, t_end = item['time'].split(' - ')
        t_s = f"00:{t_start},000"
        t_e = f"00:{t_end},000"
        srt_updated += f"{i}\n{t_s} --> {t_e}\n{item['en']}\n{item['ar']}\n{item['zh']}\n\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(srt_updated.strip() + "\n")
    print(f"[OK] Generated trilingual SRT at: {output_path}")

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(out_dir, "Cairo_Plaza_EN_ZH_Captions_Discount.srt")
    generate_srt(out_file)
