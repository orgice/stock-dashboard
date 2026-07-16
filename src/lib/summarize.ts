// Rule-based plain-language explanations for common DART disclosure titles.
// Matches by substring since report titles vary slightly (e.g. "(자기주식취득결정)").
// A future iteration could swap this for an LLM call, but a fixed dictionary
// is enough for the handful of report types individual investors see most.
const RULES: { pattern: RegExp; explain: string }[] = [
  {
    pattern: /유상증자/,
    explain: "회사가 새 주식을 발행해 자금을 조달하려고 합니다. 기존 주주의 지분율이 낮아질 수 있어요.",
  },
  {
    pattern: /무상증자/,
    explain: "회사가 주주에게 대가 없이 주식을 추가로 나눠줍니다. 보유 주식 수가 늘어나요.",
  },
  {
    pattern: /자기주식취득/,
    explain: "회사가 자기 회사 주식을 직접 사들입니다. 보통 주가 부양 목적으로 해석돼요.",
  },
  {
    pattern: /자기주식처분/,
    explain: "회사가 보유하고 있던 자기 주식을 시장에 다시 내놓습니다. 물량 부담으로 주가에 부정적일 수 있어요.",
  },
  {
    pattern: /현금.?배당|현금ㆍ현물배당/,
    explain: "회사가 주주에게 현금(또는 현물)으로 배당을 지급하기로 했습니다.",
  },
  {
    pattern: /분기보고서|반기보고서|사업보고서/,
    explain: "정기 실적 보고서입니다. 매출, 이익 등 재무 상태를 확인할 수 있어요.",
  },
  {
    pattern: /타법인주식.*취득/,
    explain: "다른 회사의 주식이나 지분을 사들입니다. 인수·투자 목적일 가능성이 높아요.",
  },
  {
    pattern: /최대주주.*변경/,
    explain: "회사의 최대주주가 바뀝니다. 경영권 변동과 관련된 중요한 공시예요.",
  },
  {
    pattern: /전환사채|신주인수권부사채/,
    explain: "회사가 주식으로 바꿀 수 있는 채권을 발행해 자금을 조달합니다.",
  },
];

const DEFAULT_EXPLANATION = "회사의 주요 의사결정 관련 공시입니다. 자세한 내용은 원문을 확인해보세요.";

export function summarizeDisclosure(title: string): string {
  const rule = RULES.find((r) => r.pattern.test(title));
  return rule ? rule.explain : DEFAULT_EXPLANATION;
}
