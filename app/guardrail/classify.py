"""데이터 분류 5등급 (data sensitivity classification).

정책 정의서 제2장의 5등급 체계를 구현합니다.  프롬프트에 어떤 종류의 데이터가
포함되어 있는지를 앞선 탐지기들의 결과(context에 누적된 신호 + 이번 파이프라인의
findings)로부터 판정하고, 각 등급의 외부 생성형 AI 허용 범위를 함께 제시합니다.

위협 점수(injection 등)와 달리 이 등급은 "무엇을 어디까지 외부 AI에 보내도 되는가"를
나타내는 **데이터 민감도** 축입니다.  파이프라인의 마지막 입력 단계로 실행되어 앞선
탐지 결과를 종합합니다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .base import BaseDetector, DetectorResult, Severity, Stage


@dataclass(frozen=True)
class DataGrade:
    level: int
    key: str
    label: str
    allowance: str  # 외부 생성형 AI 활용 가능 범위
    severity: Severity


GRADES: dict[int, DataGrade] = {
    1: DataGrade(1, "public", "1등급 · 공개", "외부 AI 자유 활용 가능 (공개 정보)", Severity.INFO),
    2: DataGrade(2, "internal", "2등급 · 내부", "외부 AI 제한적 활용 (내부 업무 정보, 검토 권장)", Severity.LOW),
    3: DataGrade(3, "sensitive", "3등급 · 민감(개인정보)", "마스킹 후에만 외부 AI 전달 허용", Severity.MEDIUM),
    4: DataGrade(4, "confidential", "4등급 · 기밀", "외부 AI 전달 금지 (대외비·성적·인사)", Severity.HIGH),
    5: DataGrade(5, "restricted", "5등급 · 극비", "외부 AI 전달 절대 금지 (주민번호·자격증명 등)", Severity.CRITICAL),
}


_OPERATIONAL_WEIGHT = 35.0  # MEDIUM 이상일 때만 유해/권한 신호를 등급에 반영


def classify_grade(finding_pairs: list[tuple[str, float]], context: dict[str, Any]) -> int:
    """탐지 결과 (카테고리, severity weight) 목록으로부터 최고 데이터 등급을 산정.

    유해/권한 신호는 실제로 위험한 경우(MEDIUM 이상)에만 등급을 올립니다 — 방어
    목적의 단순 언급(INFO)은 등급을 올리지 않습니다.  개인정보·자격증명은 데이터
    민감도 자체이므로 severity와 무관하게 반영합니다.
    """
    grade = 1

    def bump(g: int) -> None:
        nonlocal grade
        grade = max(grade, g)

    for cat, weight in finding_pairs:
        operational = weight >= _OPERATIONAL_WEIGHT
        # 5등급: 자격증명, 극단적 유해(무기/자해/아동)
        if cat.startswith("secret."):
            bump(4 if cat == "secret.confidential_marker" else 5)
        elif cat in ("harmful.weapons", "harmful.csam", "harmful.self_harm") and operational:
            bump(5)
        # 4등급: RAG 권한 초과(성적/인사), 악성코드/침입 등 실행요청
        elif cat == "rag.access_violation":
            bump(4)
        elif (
            cat in ("harmful.malware", "harmful.intrusion", "harmful.drugs", "harmful.fraud", "harmful.hate")
            and operational
        ):
            bump(4)
        # 3등급: 개인정보
        elif cat.startswith("pii."):
            bump(3)
        # 2등급: 인젝션/난독화 등 내부 처리 위험 신호
        elif cat.startswith(("injection.", "obfuscation.", "anomaly.")) and operational:
            bump(2)

    return grade


class DataClassifier(BaseDetector):
    """5등급 데이터 분류를 파이프라인 마지막 입력 단계로 수행."""

    name = "data_classifier"
    stage = Stage.INPUT
    title = "데이터 분류 (5등급)"
    description = (
        "프롬프트에 포함된 데이터의 민감도를 5등급으로 분류하고 각 등급의 외부 생성형 "
        "AI 활용 가능 범위를 제시합니다. 앞선 탐지 결과(개인정보·자격증명·기밀·권한초과)를 "
        "종합해 '무엇을 어디까지 외부 AI로 보낼 수 있는가'를 판정합니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        # engine이 넘겨준 (카테고리, severity weight) 목록으로 등급을 산정.
        pairs: list[tuple[str, float]] = context.get("_finding_pairs", [])
        crit_pii = set(context.get("_critical_pii", []))

        grade_level = classify_grade(pairs, context)
        # 체크섬 유효 주민번호/카드는 5등급으로 격상.
        if crit_pii & {"pii.rrn", "pii.credit_card"}:
            grade_level = max(grade_level, 5)

        grade = GRADES[grade_level]
        # 데이터 등급은 위험 점수와 별개의 '분류 라벨' 축이므로 finding(점수 기여)을
        # 만들지 않고 context로만 노출합니다. 정책 판단은 개별 탐지기가 담당합니다.
        return self._result(
            findings=[],
            context={
                "data_grade": grade_level,
                "data_grade_label": grade.label,
                "data_grade_allowance": grade.allowance,
            },
        )
