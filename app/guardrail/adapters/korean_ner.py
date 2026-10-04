"""Presidio 한국어 — mecab 없이 돌리기 위한 NLP 엔진과 한국어 NER 인식기.

왜 이 파일이 따로 있나
--------------------
`presidio.py` 는 `languages=("en",)` 로 고정돼 있어서, 한국어 학사·행정 문서가
도메인인 이 프로젝트에서 사실상 기여하지 못하고 있었다.

한국어를 켜려면 Presidio 가 'ko' 를 지원하는 NLP 엔진을 요구하는데,
**spaCy 의 한국어 파이프라인은 `mecab-ko` 시스템 패키지를 요구한다**
(`spacy.blank("ko")` 가 ImportError 로 죽는 것을 확인했다).  Docker 이미지에
OS 패키지와 사전 데이터를 넣는 비용이 크고, 그렇게 얻는 spaCy 한국어 NER 의
품질도 높지 않다.  게다가 Presidio 자신의 이슈 추적기가 **교착어에서는 context
enhancement 가 동작하지 않는다**고 적어 두었다(한국어 lemma 가 형태소 결합형이라
문맥 단어 매칭이 어긋난다).

그래서 두 가지를 분리했다.
  · **토큰화** — mecab 대신 spaCy 의 다국어 blank 파이프라인(`xx`)을 'ko' 자리에
    끼운다.  Presidio 가 요구하는 인터페이스만 채우는 용도다.
  · **개체 인식** — KoELECTRA 기반 한국어 NER 모델을 Presidio 인식기로 감싼다.
    실제 판단은 전부 이쪽이 한다.

이렇게 하면 OS 의존성 없이 Presidio 를 한국어로 돌릴 수 있다.

무엇을 더 잡으려는 것인가
----------------------
내장 `pii.py` 는 이미 식별자 8종(주민번호·카드·사업자·휴대폰·유선·이메일·계좌·여권)을
정규식과 체크섬으로 잡는다.  **정규식이 못 잡는 것은 이름·주소·소속이다.**
그것만이 NER 을 들일 이유이므로, 패턴 인식기는 추가하지 않는다(중복이다).

켜기:
    GUARDRAIL_USE_PRESIDIO=1
    GUARDRAIL_PRESIDIO_LANGS=en,ko
    GUARDRAIL_KO_NER_MODEL=Leo97/KoELECTRA-small-v3-modu-ner   # 기본값
"""

from __future__ import annotations

import functools
import os
from typing import Any

KO_NER_MODEL = os.environ.get("GUARDRAIL_KO_NER_MODEL", "Leo97/KoELECTRA-small-v3-modu-ner")
# ONNX 디렉터리가 있으면 그쪽을 쓴다 — torch 를 이미지에 넣지 않기 위해서다.
# KoELECTRA-small 은 ONNX 로 56MB 지만 torch+transformers 는 2GB 를 넘는다.
# 변환: scripts/export_ko_ner_onnx.py
KO_NER_ONNX_DIR = os.environ.get("GUARDRAIL_KO_NER_ONNX_DIR", "")
KO_NER_MIN_SCORE = float(os.environ.get("GUARDRAIL_KO_NER_MIN_SCORE", "0.6"))

# 국립국어원 모두의말뭉치 NER 태그 → Presidio 개체.
# OG(기관)는 일부러 뺀다 — 기관명은 개인정보가 아니고, 「한국과학기술원 도서관」
# 같은 평범한 질의를 건드리게 된다.
_TAG_TO_ENTITY: dict[str, str] = {
    "PS": "PERSON",
    "LC": "LOCATION",
}


def _onnx_ready() -> bool:
    return bool(KO_NER_ONNX_DIR) and os.path.isfile(os.path.join(KO_NER_ONNX_DIR, "model.onnx"))


@functools.lru_cache(maxsize=1)
def korean_ner_available() -> bool:
    try:
        import spacy  # noqa: F401
        from presidio_analyzer import AnalyzerEngine  # noqa: F401
        from transformers import AutoTokenizer  # noqa: F401
    except ImportError:
        return False
    if _onnx_ready():
        try:
            import onnxruntime  # noqa: F401
        except ImportError:
            return False
    else:
        try:
            import torch  # noqa: F401
        except ImportError:
            return False
    try:
        _ko_analyzer()
    except Exception:  # noqa: BLE001 — 모델이 없으면 조용히 비활성
        return False
    return True


@functools.lru_cache(maxsize=1)
def _ner_pipeline() -> Any:
    """torch 경로 (개발·실험용)."""
    from transformers import AutoModelForTokenClassification, AutoTokenizer, pipeline

    tok = AutoTokenizer.from_pretrained(KO_NER_MODEL)
    model = AutoModelForTokenClassification.from_pretrained(KO_NER_MODEL)
    return pipeline(
        "token-classification",
        model=model,
        tokenizer=tok,
        aggregation_strategy="simple",
        device=-1,  # CPU 고정 — 배포 호스트에 GPU 가 없다
    )


@functools.lru_cache(maxsize=1)
def _onnx_session() -> Any:
    """ONNX 경로 (배포용). torch 없이 56MB 로 끝난다."""
    import json

    import onnxruntime as ort
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(KO_NER_ONNX_DIR)
    sess = ort.InferenceSession(
        os.path.join(KO_NER_ONNX_DIR, "model.onnx"), providers=["CPUExecutionProvider"]
    )
    with open(os.path.join(KO_NER_ONNX_DIR, "config.json"), encoding="utf-8") as fh:
        id2label = {int(k): v for k, v in json.load(fh)["id2label"].items()}
    return tok, sess, id2label


def _entities_onnx(text: str) -> list[dict[str, Any]]:
    """ONNX 추론 + BIO 묶기.  transformers pipeline 의 aggregation 을 손으로 한다."""
    import numpy as np

    tok, sess, id2label = _onnx_session()
    enc = tok(text, return_tensors="np", return_offsets_mapping=True,
              truncation=True, max_length=512)
    offsets = enc.pop("offset_mapping")[0]
    feed = {i.name: enc[i.name] for i in sess.get_inputs() if i.name in enc}
    logits = sess.run(None, feed)[0][0]
    e = np.exp(logits - logits.max(axis=-1, keepdims=True))
    probs = e / e.sum(axis=-1, keepdims=True)
    ids = probs.argmax(axis=-1)

    out: list[dict[str, Any]] = []
    cur: dict[str, Any] | None = None
    top = probs.max(axis=-1)
    for pos, (idx, (start, end)) in enumerate(zip(ids, offsets, strict=False)):
        label = id2label.get(int(idx), "O")
        # 특수 토큰([CLS]/[SEP])은 offset 이 (0,0) 으로 온다.
        if int(end) == 0:
            cur = None
            continue
        if label == "O":
            cur = None
            continue
        prefix, _, tag = label.partition("-")
        score = float(top[pos])
        if prefix == "B" or cur is None or cur["entity_group"] != tag:
            cur = {"entity_group": tag, "start": int(start), "end": int(end), "score": score}
            out.append(cur)
        else:
            cur["end"] = int(end)
            # 이어 붙인 조각 중 가장 낮은 확신도를 그 개체의 점수로 쓴다.
            cur["score"] = min(cur["score"], score)
    return out


# 한 번에 넣는 글자 수와 겹침.  모델 입력이 512 토큰으로 잘리므로, 긴 문서를
# 그대로 넣으면 **뒷부분이 검사되지 않는다.**  붙여넣기 유출(삼성 사례)이 바로
# 긴 문서라, 앞부분만 보는 것은 이 시스템의 목적을 배신한다.
_CHUNK_CHARS = 700
_CHUNK_OVERLAP = 80


def _entities_once(text: str) -> list[dict[str, Any]]:
    return _entities_onnx(text) if _onnx_ready() else _ner_pipeline()(text)


def _entities(text: str) -> list[dict[str, Any]]:
    """긴 글은 겹치는 창으로 나눠 전부 훑는다.

    겹침을 두는 이유는 창 경계에서 이름이 잘리는 것을 막기 위해서다.
    경계에 걸친 개체가 두 번 잡히므로 (start, end) 로 중복을 제거한다.
    """
    if len(text) <= _CHUNK_CHARS:
        return _entities_once(text)

    seen: dict[tuple[int, int], dict[str, Any]] = {}
    step = _CHUNK_CHARS - _CHUNK_OVERLAP
    for base in range(0, len(text), step):
        window = text[base : base + _CHUNK_CHARS]
        if not window.strip():
            continue
        for ent in _entities_once(window):
            start, end = base + int(ent["start"]), base + int(ent["end"])
            key = (start, end)
            prev = seen.get(key)
            # 같은 자리를 두 번 봤으면 더 확신하는 쪽을 남긴다.
            if prev is None or float(ent["score"]) > float(prev["score"]):
                seen[key] = {**ent, "start": start, "end": end}
    return sorted(seen.values(), key=lambda e: e["start"])


def _build_recognizer() -> Any:
    from presidio_analyzer import EntityRecognizer, RecognizerResult

    class KoreanNerRecognizer(EntityRecognizer):
        """KoELECTRA 한국어 NER 을 Presidio 인식기로 감싼다."""

        def load(self) -> None:  # Presidio 가 요구하는 훅
            return None

        def analyze(self, text: str, entities: list[str], nlp_artifacts: Any = None):
            results = []
            for ent in _entities(text):
                tag = str(ent.get("entity_group", "")).split("-")[-1]
                mapped = _TAG_TO_ENTITY.get(tag)
                if not mapped or mapped not in entities:
                    continue
                score = float(ent.get("score", 0.0))
                if score < KO_NER_MIN_SCORE:
                    continue
                results.append(
                    RecognizerResult(
                        entity_type=mapped,
                        start=int(ent["start"]),
                        end=int(ent["end"]),
                        score=score,
                    )
                )
            return results

    return KoreanNerRecognizer(
        supported_entities=list(_TAG_TO_ENTITY.values()),
        supported_language="ko",
        name="korean_ner",
    )


@functools.lru_cache(maxsize=1)
def _ko_analyzer() -> Any:
    """mecab 없이 'ko' 를 지원하는 Presidio 분석기."""
    import spacy
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NerModelConfiguration, SpacyNlpEngine

    class _BlankKoNlpEngine(SpacyNlpEngine):
        """토큰화만 담당한다. 개체 인식은 KoreanNerRecognizer 가 한다."""

        def __init__(self) -> None:
            super().__init__(
                models=[{"lang_code": "ko", "model_name": "xx"}],
                ner_model_configuration=NerModelConfiguration(),
            )
            self.nlp = {"ko": spacy.blank("xx")}

    analyzer = AnalyzerEngine(nlp_engine=_BlankKoNlpEngine(), supported_languages=["ko"])
    analyzer.registry.add_recognizer(_build_recognizer())
    return analyzer


def analyze_korean(text: str) -> list[Any]:
    """한국어 텍스트에서 Presidio 개체를 찾는다. 사용 불가면 빈 목록."""
    if not korean_ner_available():
        return []
    try:
        return _ko_analyzer().analyze(text=text, language="ko")
    except Exception:  # noqa: BLE001 — 한 요청이 죽는 것보다 낫다
        return []
