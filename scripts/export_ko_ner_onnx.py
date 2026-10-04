#!/usr/bin/env python3
"""한국어 NER 모델을 ONNX 로 변환한다 — 배포 이미지에 torch 를 넣지 않기 위해서.

왜 필요한가
----------
`transformers` + `torch` 로 돌리면 이미지가 2GB 넘게 늘고, CD 가 main 푸시마다
그걸 빌드한다.  KoELECTRA-small 은 ONNX 로 **56MB** 라 onnxruntime 만으로 돌고,
덤으로 더 빠르다 (실측 10.5ms → 4.1ms).

실행 (개발 환경에서 한 번만. torch 가 필요하다):
    pip install torch transformers onnxscript
    python3 scripts/export_ko_ner_onnx.py --out ./models/ko-ner-onnx

그 뒤 배포 쪽에서는 torch 없이:
    GUARDRAIL_USE_PRESIDIO=1
    GUARDRAIL_KO_NER_ONNX_DIR=/app/models/ko-ner-onnx
"""
from __future__ import annotations

import argparse
import os

DEFAULT_MODEL = "Leo97/KoELECTRA-small-v3-modu-ner"


def main() -> None:
    ap = argparse.ArgumentParser(description="한국어 NER → ONNX 변환")
    ap.add_argument("--model", default=DEFAULT_MODEL, help=f"HF 모델 (기본 {DEFAULT_MODEL})")
    ap.add_argument("--out", default="./models/ko-ner-onnx", help="출력 디렉터리")
    args = ap.parse_args()

    import torch
    from transformers import AutoModelForTokenClassification, AutoTokenizer

    tok = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForTokenClassification.from_pretrained(args.model).eval()
    os.makedirs(args.out, exist_ok=True)

    enc = tok("홍길동 학생", return_tensors="pt")
    names = ["input_ids", "attention_mask", "token_type_ids"]
    torch.onnx.export(
        model,
        tuple(enc[n] for n in names),
        os.path.join(args.out, "model.onnx"),
        input_names=names,
        output_names=["logits"],
        dynamic_axes={k: {0: "batch", 1: "seq"} for k in [*names, "logits"]},
        opset_version=14,
        do_constant_folding=True,
        dynamo=False,
    )
    # 토크나이저와 라벨 매핑이 함께 있어야 추론 쪽에서 쓸 수 있다.
    tok.save_pretrained(args.out)
    model.config.save_pretrained(args.out)

    size = os.path.getsize(os.path.join(args.out, "model.onnx")) / 1e6
    print(f"변환 완료: {args.out}/model.onnx  ({size:.1f} MB)")
    print("배포 시 GUARDRAIL_KO_NER_ONNX_DIR 로 이 경로를 넘긴다.")


if __name__ == "__main__":
    main()
