import json, os, requests, time, sys

JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
TOKEN = "ac1da5ad6456a64abd0363a7edb03b218f1d9c51"
MODEL = "PaddleOCR-VL-1.6"
headers = {"Authorization": f"bearer {TOKEN}"}
optional_payload = {"useDocOrientationClassify": False, "useDocUnwarping": False, "useChartRecognition": False}

imgs = [
    r"D:\用户文档\Documents\WeChat Files\wxid_nolus6apited22\FileStorage\Temp\03425617af99a21c2bd983497e8376aa_.png",
    r"D:\用户文档\Documents\WeChat Files\wxid_nolus6apited22\FileStorage\Temp\0405e970756b6d503bf807fcf05a97b7_.png",
]

for fp in imgs:
    print(f"\n========== {os.path.basename(fp)} ==========")
    data = {"model": MODEL, "optionalPayload": json.dumps(optional_payload)}
    with open(fp, "rb") as f:
        files = {"file": f}
        r = requests.post(JOB_URL, headers=headers, data=data, files=files)
    if r.status_code != 200:
        print("submit fail", r.status_code, r.text[:200]); continue
    jobId = r.json()["data"]["jobId"]
    print("jobId:", jobId)
    while True:
        jr = requests.get(f"{JOB_URL}/{jobId}", headers=headers).json()["data"]
        st = jr["state"]
        if st == "done":
            jsonl_url = jr["resultUrl"]["jsonUrl"]
            break
        if st == "failed":
            print("failed:", jr.get("errorMsg")); sys.exit(1)
        time.sleep(4)
    lines = requests.get(jsonl_url).text.strip().split("\n")
    for line in lines:
        if not line.strip(): continue
        result = json.loads(line)["result"]
        for res in result["layoutParsingResults"]:
            txt = res["markdown"]["text"]
            out = f"ocr-{os.path.basename(fp)[:8]}.md"
            with open(out, "w", encoding="utf-8") as f: f.write(txt)
            print("saved:", out)