"""RAG 권한 접근통제 (retrieval-stage access control).

대학 학사 AI는 규정·공지·매뉴얼을 RAG로 참조합니다.  핵심은 응답을 사후
필터링하는 것이 아니라 **검색 단계에서** 요청자 권한(CLR)에 따라 접근 가능한
문서를 제한하는 것입니다 — 같은 질의라도 권한 등급이 다르면 다른 답이 나옵니다.

이 모듈은 두 가지를 제공합니다.
  1. `retrieve(query, clearance)` — 질의에 매칭되는 KB 문서 중 권한이 허용하는
     것만 반환.  무방비 경로는 `clearance=None`으로 전 문서를 그대로 노출합니다.
  2. `RAGAccessControl` 탐지기 — 요청이 자신의 권한을 초과하는 문서를 노리는 경우
     finding을 발생시켜 정책 엔진이 차단/표시하도록 합니다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .base import BaseDetector, DetectorResult, Finding, Severity, Stage

# 권한 등급 (Clearance Level).  숫자가 클수록 높은 권한.  KAIST 구성원 역할을
# 4개 등급(CLR0~3)에 매핑합니다.
CLEARANCE_LEVELS: dict[str, int] = {
    "external": 0,    # 외부인/미로그인
    "student": 1,     # 학생
    "researcher": 1,  # 연구원(학생연구원 포함)
    "professor": 2,   # 교수
    "staff": 2,       # 행정 직원
    "registrar": 3,   # 학사행정팀 (성적·학적 접근)
    "hr": 3,          # 인사팀 (인사·급여 접근)
}

CLEARANCE_LABELS: dict[str, str] = {
    "external": "외부인 (CLR0)",
    "student": "학생 (CLR1)",
    "researcher": "연구원 (CLR1)",
    "professor": "교수 (CLR2)",
    "staff": "행정 직원 (CLR2)",
    "registrar": "학사행정팀 (CLR3)",
    "hr": "인사팀 (CLR3)",
}


@dataclass(frozen=True)
class KBDocument:
    doc_id: str
    title: str
    min_clr: int          # 이 문서를 검색하려면 필요한 최소 권한
    keywords: tuple[str, ...]
    snippet: str          # 문서 내용 (검색 시 모델 컨텍스트로 주입)
    grade: int            # 데이터 분류 등급 (1~5)


# KAIST 학사·행정 모의 지식베이스.  실제로는 벡터 검색이지만 데모에서는 키워드 매칭.
KNOWLEDGE_BASE: tuple[KBDocument, ...] = (
    KBDocument(
        doc_id="campus-notice",
        title="캠퍼스 공지·학사일정",
        min_clr=0,
        keywords=("학사일정", "수강신청", "정정", "개강", "종강", "시험", "방학", "일정", "공지", "셔틀", "도서관"),
        snippet="2025 가을학기 수강신청은 8월 셋째 주, 정정 기간은 개강 후 1주간입니다.",
        grade=1,
    ),
    KBDocument(
        doc_id="course-manual",
        title="수강신청·학사규정 매뉴얼",
        min_clr=1,
        keywords=("수강신청", "학사규정", "졸업요건", "최대학점", "신청방법", "재수강", "학점", "졸업"),
        snippet="학사과정은 학기당 최대 21학점, 졸업 요건은 총 130학점 이상입니다.",
        grade=2,
    ),
    KBDocument(
        doc_id="research-admin",
        title="연구비·과제 관리 지침",
        min_clr=2,
        keywords=("연구비", "과제", "집행", "정산", "연구과제", "간접비", "인건비", "기자재"),
        snippet="연구과제 인건비는 참여율 기준으로 집행하며, 기자재 구매는 500만원 이상 시 계약팀 협의.",
        grade=3,
    ),
    KBDocument(
        doc_id="admin-manual",
        title="행정 내부 처리 매뉴얼 (대외비)",
        min_clr=2,
        keywords=("행정", "내부", "매뉴얼", "결재", "처리절차", "예산", "품의", "전자결재"),
        snippet="[대외비] 예산 품의는 3단계 전자결재를 거치며, 500만원 이상은 처장 승인이 필요합니다.",
        grade=4,
    ),
    KBDocument(
        doc_id="student-records",
        title="학생 성적·학적 기록 DB",
        # 일반 학사 문의('최대 학점')와 겹치지 않도록 구체 식별자만 키워드로 둡니다.
        # 광범위한 '성적 조회' 의도는 아래 _ESCALATION 정규식이 별도로 포착합니다.
        min_clr=3,
        keywords=("석차", "학적", "징계", "장학내역", "타 학생", "다른 학생", "남의 성적", "전체 학생", "지도학생"),
        snippet="[기밀] 홍길동(20201234) 3.87/4.3, 김철수(20205678) 2.14/4.3, 징계이력 1건.",
        grade=4,
    ),
    KBDocument(
        doc_id="personnel-records",
        title="교직원 인사·급여 기록 DB",
        min_clr=3,
        keywords=("인사기록", "급여", "연봉", "호봉", "징계이력", "평정", "인사평가", "교수 급여", "직원 급여"),
        snippet="[기밀] 이몽룡 교수 호봉 12호, 연봉 9,800만원, 성과평가 A. 박문수 직원 6급 5호봉.",
        grade=4,
    ),
)

# 권한 초과를 명시적으로 노리는 표현 (탐지 신호 강화용).
_ESCALATION = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"(?:다른|타|남의|친구|동기|지도)\s*(?:학생|사람|애|교수)?(?:의|들)?\s*(?:성적|학점|석차|정보|기록)",
        r"(?:전체|모든)\s*(?:학생|교직원)\s*(?:의|들)?\s*(?:성적|명단|정보|석차|급여)",
        r"(?:인사|징계|급여|연봉|호봉|인사평가)\s*(?:기록|정보|이력|내역)?",
        r"(?:교수|직원|교직원)\s*(?:의|들)?\s*(?:급여|연봉|호봉|인사)",
        r"성적(?:과|와)?\s*(?:석차)?\s*(?:을|를)?\s*(?:조회|알려|보여|출력)",
    )
)


@dataclass
class RetrievalResult:
    permitted: list[KBDocument] = field(default_factory=list)
    denied: list[KBDocument] = field(default_factory=list)

    def context_text(self) -> str:
        """검색된(허용된) 문서를 모델 컨텍스트 문자열로 결합."""
        if not self.permitted:
            return ""
        lines = [f"[참고자료: {d.title}] {d.snippet}" for d in self.permitted]
        return "\n".join(lines)


def retrieve(query: str, clearance: str | None) -> RetrievalResult:
    """질의에 매칭되는 문서를 찾고 권한으로 필터링.

    `clearance=None`이면 무방비 경로 — 권한 검사 없이 매칭 문서를 전부 반환.
    """
    matched = [doc for doc in KNOWLEDGE_BASE if any(k in query for k in doc.keywords)]

    def _add(doc_id: str) -> None:
        doc = next((d for d in KNOWLEDGE_BASE if d.doc_id == doc_id), None)
        if doc and doc not in matched:
            matched.append(doc)

    # 명시적 권한초과 의도는 키워드가 정확히 없어도 대상 기록 문서를 대상으로 간주해
    # 접근통제가 동작하도록 합니다 — 인사/급여 의도는 인사기록, 그 외 성적 의도는 학적.
    if any(p.search(query) for p in _ESCALATION):
        if re.search(r"(?:급여|연봉|호봉|인사|평정)", query):
            _add("personnel-records")
        else:
            _add("student-records")

    result = RetrievalResult()

    if clearance is None:
        result.permitted = matched  # 무방비: 전부 노출
        return result

    level = CLEARANCE_LEVELS.get(clearance, 1)
    for doc in matched:
        if doc.min_clr <= level:
            result.permitted.append(doc)
        else:
            result.denied.append(doc)
    return result


class RAGAccessControl(BaseDetector):
    """검색 단계 권한 필터를 finding으로 표현하는 탐지기."""

    name = "rag_access"
    stage = Stage.INPUT
    title = "RAG 권한 접근통제"
    description = (
        "학사 RAG 지식베이스를 참조할 때 요청자 권한(CLR)에 따라 접근 가능한 문서를 "
        "검색 단계에서 제한합니다. 권한을 초과하는 정보(타 학생 성적·인사기록 등)를 "
        "요구하면 차단합니다. 같은 질의도 권한 등급이 다르면 결과가 달라집니다."
    )

    def inspect(self, text: str, context: dict[str, Any]) -> DetectorResult:
        target = context.get("normalized", text)
        clearance = context.get("clearance", "student")
        result = retrieve(target, clearance)
        findings: list[Finding] = []

        escalation = any(p.search(target) for p in _ESCALATION)

        for doc in result.denied:
            # 명시적 권한초과 의도('다른 학생 성적 조회')는 즉시 차단(CRITICAL),
            # 단순 키워드 매칭에 의한 초과는 검토 표시(HIGH)로 구분합니다.
            findings.append(
                Finding(
                    detector=self.name,
                    category="rag.access_violation",
                    severity=Severity.CRITICAL if escalation else Severity.HIGH,
                    confidence=0.9 if escalation else 0.75,
                    message=(
                        f"요청자 권한({CLEARANCE_LABELS.get(clearance, clearance)})으로는 "
                        f"'{doc.title}'(요구 권한 CLR{doc.min_clr})에 접근할 수 없습니다. "
                        "검색 단계에서 차단됩니다."
                    ),
                    evidence=doc.title,
                    metadata={
                        "doc_id": doc.doc_id,
                        "required_clr": doc.min_clr,
                        "user_clr": CLEARANCE_LEVELS.get(clearance, 1),
                        "data_grade": doc.grade,
                    },
                )
            )

        return self._result(
            findings=findings,
            context={
                "rag_permitted": [d.doc_id for d in result.permitted],
                "rag_denied": [d.doc_id for d in result.denied],
                "rag_permitted_context": result.context_text(),
                "rag_matched": [d.doc_id for d in (result.permitted + result.denied)],
            },
        )
