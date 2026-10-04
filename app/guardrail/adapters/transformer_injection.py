"""ML 프롬프트 인젝션 분류기 어댑터 (ONNX, CPU 전용).

왜 ONNX 인가
-----------
`transformers` + `torch` 를 넣으면 이미지가 2GB 넘게 늘고, CD 가 main 푸시마다
그걸 빌드한다.  ONNX Runtime 만 쓰면 수백 MB 로 끝나고 CPU 에서 수십 ms 다.
사이트가 **실측 지연을 공표**하고 있으므로, 이 어댑터를 켜면
`web/tools/bench-latency.py` 를 반드시 다시 재야 한다.

왜 켜져 있지 않은가 (중요)
------------------------
정규식 탐지기는 패러프레이즈·번역에 약하다.  그래서 ML 분류기를 더하는 것이
업계 기본 수순인데, **한국어에서 검증된 공개 분류기가 없다.**

  · protectai/deberta-v3-base-prompt-injection-v2 — 모델 카드가 영어 전용임을
    명시하고, 탈옥은 탐지하지 않는다고 적어 두었다.
  · meta-llama/Llama-Prompt-Guard-2-86M — 다국어(mDeBERTa)지만 평가 언어가
    영·불·독·힌디·이탈리아·포르투갈·스페인·태국이고 **한국어가 없다.** 게이트 모델.

2026-10-04 실측 — 모델 둘을 재서 **붙이지 않기로 결정했다**
---------------------------------------------------------
코퍼스 186건(정상 116 / 공격 70), 임계치 0.9 기준.

    모델                              공격 적중    정상 오탐
    protectai (DeBERTa-v3, 영어)       70.0%       42.2%   ← 쓸 수 없음
    proventra (mDeBERTa, 다국어)       41.4%        4.3%
    ── 규칙 기반 (우리 엔진) ──         98.6%        0.0%

영어 전용 모델은 **멀쩡한 한국어 질의의 42%** 를 인젝션으로 오판한다.
다국어 모델은 그 문제를 해결하지만(4.3%) 공격을 41% 밖에 못 잡는다.

결정적인 것은 **한계 기여**다. 다국어 모델을 규칙 위에 얹으면:
  · 규칙이 놓친 공격 중 새로 잡는 것 … **0건**
  · 새로 막히는 정상 질의 ………………… **5건**
즉 순손실이다. 그 5건은 전부 `benign.trigger` 군이다 —
「앞에서 말한 조건은 취소하고」, 「상위 지침과 하위 지침이 충돌할 때」처럼
표면적 「이전 지시 무시」 의미에만 반응하고 문맥을 보지 못한다.

전체 수치: `attacks/corpus/results/classifier-comparison-2026-10-04.json`

→ **공개 인젝션 분류기는 한국어 도메인에서 규칙 기반 가드레일을 보강하지 못한다**
  는 것이 두 번 측정해서 얻은 결론이다. 「ML 을 붙이면 좋아진다」는 통념을
  재서 반박한 것이라, 이 음성 결과 자체가 발표에 쓸 수 있는 내용이다.

따라서 이 어댑터는 **먼저 재고 결정하라고** 만든 것이다.  `scripts/eval.py` 로
켜고 끈 값을 비교해, 재현율이 오르고 오탐이 늘지 않을 때만 기본값으로 올린다.
숫자 없이 켜면 좋아졌는지 알 수 없고, 알 수 없는 숫자는 발표에 쓸 수 없다
(CLAUDE.md 정확성 원칙).

켜기:
    GUARDRAIL_USE_PI_MODEL=1
    GUARDRAIL_PI_MODEL_DIR=/path/to/onnx     # model.onnx 와 토크나이저가 든 폴더
"""

from __future__ import annotations

import functools
import os
from typing import Any

from ..base import BaseDetector, DetectorResult, Finding, Severity, Stage

MODEL_DIR = os.environ.get("GUARDRAIL_PI_MODEL_DIR", "")
# 이 값 미만은 보고하지 않는다. 분류기 단독으로 차단시키지 않으려는 의도다 —
# 규칙 탐지기와 **보강 근거**로 합산되게 둔다(engine 의 worst_decay).
MIN_SCORE = float(os.environ.get("GUARDRAIL_PI_MIN_SCORE", "0.9"))
MAX_CHARS = 4000  # 토크나이저 입력 상한. 긴 문서는 앞부분만 본다.


@functools.lru_cache(maxsize=1)
def pi_model_available() -> bool:
    if not MODEL_DIR or not os.path.isdir(MODEL_DIR):
        return False
    try:
        import onnxruntime  # noqa: F401
        from transformers import AutoTokenizer  # noqa: F401
    except ImportError:
        return False
    try:
        _session()
    except Exception:  # noqa: BLE001 — 모델이 깨졌으면 조용히 비활성
        return False
    return True


@functools.lru_cache(maxsize=1)
def _session() -> tuple[Any, Any]:
    import onnxruntime as ort
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(MODEL_DIR)
    sess = ort.InferenceSession(
        os.path.join(MODEL_DIR, "model.onnx"),
        providers=["CPUExecutionProvider"],
    )
    return tok, sess


def classify(text: str) -> float:
    """인젝션일 확률(0~1). 모델이 없으면 0.0."""
    import numpy as np

    tok, sess = _session()
    enc = tok(text[:MAX_CHARS], return_tensors="np", truncation=True, max_length=512)
    feed = {i.name: enc[i.name] for i in sess.get_inputs() if i.name in enc}
    logits = sess.run(None, feed)[0][0]
    e = np.exp(logits - logits.max())
    return float((e / e.sum())[1])  # label 1 = INJECTION


class TransformerInjectionDetector(BaseDetector):
    """정규식이 놓치는 의미적 변형을 ML 분류기로 보강한다."""

    name = "pi_model"
    stage = Stage.INPUT
    title = "ML 인젝션 분류기 (ONNX)"
    description = (
        "정규식이 잡지 못하는 패러프레이즈·변형 프롬프트 인젝션을 분류 모델로 추가 탐지합니다. "
        "모델이 없으면 규칙 탐지기만으로 동작합니다. "
        "※ 공개 모델 대부분이 영어 기준이라 한국어 성능은 반드시 실측 후 판단할 것."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        if not pi_model_available():
            return self._result(findings=[], context={"pi_model": "unavailable"})

        target = context.get("normalized", text)
        try:
            prob = classify(target)
        except Exception as exc:  # noqa: BLE001 — 모델 오류로 요청을 죽이지 않는다
            return self._result(findings=[], context={"pi_model": f"error:{type(exc).__name__}"})

        findings: list[Finding] = []
        if prob >= MIN_SCORE:
            findings.append(
                Finding(
                    detector=self.name,
                    category="injection.ml_classifier",
                    severity=Severity.HIGH,
                    confidence=prob,
                    message=f"분류 모델이 프롬프트 인젝션으로 판정했습니다 (확률 {prob:.2f}).",
                    evidence=target[:120],
                    metadata={"engine": "onnx", "probability": round(prob, 4)},
                )
            )
        return self._result(
            findings=findings, context={"pi_model": "ran", "pi_prob": round(prob, 4)}
        )
