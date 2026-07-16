# 투자 대시보드 (MVP)

개인 투자자를 위한 관심종목 요약 + 공시 알림/쉬운 요약 대시보드. OpenDART, KRX Open API, ECOS 데이터를 사용한다.

## 실행 방법

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속. **API 키가 없어도** 목(mock) 데이터로 바로 확인 가능하다 (`src/lib/mock/`).

## API 키 연동

1. `.env.local.example`을 `.env.local`로 복사
2. 아래에서 키를 발급받아 채워 넣기
   - **OpenDART**: https://opendart.fss.or.kr 회원가입 → "인증키 신청/관리"에서 즉시 발급
   - **KRX Open API**: https://openapi.krx.co.kr 신청 (승인까지 시간이 걸릴 수 있음)
   - **ECOS**: https://ecos.bok.or.kr/api 회원가입 → 인증키 신청, 즉시 발급
3. 키를 채운 항목부터 자동으로 라이브 데이터로 전환된다 (`src/lib/dart.ts`, `krx.ts`, `ecos.ts`의 각 함수가 `process.env.*_API_KEY` 유무로 분기)

> **참고**: OpenDART는 종목코드(6자리)가 아니라 8자리 `corp_code`로 회사를 식별한다. 실 데이터 연동 시 `corpCode.xml` 매핑 파일을 받아 캐싱하는 작업이 추가로 필요하다 (현재 `lib/dart.ts`는 이 매핑이 이미 되어 있다고 가정).

## 구조

- `src/app/page.tsx` — 관심종목 홈 (localStorage 기반, 종목 추가/삭제)
- `src/app/stock/[code]/page.tsx` — 종목 상세 (시세, 재무 그래프, 배당·채권금리 비교, 공시)
- `src/app/disclosures/page.tsx` — 관심종목 전체 공시 피드
- `src/app/api/*` — DART/KRX/ECOS 프록시 Route Handler (API 키는 서버에서만 사용, 클라이언트에 노출 안 됨)
- `src/lib/*.ts` — 각 API 클라이언트. 키 없으면 `lib/mock/*.json` 반환
- `src/lib/summarize.ts` — 공시 제목을 쉬운 문장으로 바꾸는 규칙 기반 매핑 (추후 LLM 연동 가능)

## 다음 단계 후보

- 실제 종목 검색 (현재는 코드/이름 직접 입력)
- DART corp_code 매핑 자동화
- 뉴스 감성 요약, 포트폴리오 트래커 등 (초기 기획 논의 참고)
