import { ProductAreaShell } from "@/components/ProductAreaShell";
import type { DemoArea } from "@/lib/demo/types";
import HomeScoreGuide from "@/components/score-guide/HomeScoreGuide";
import PersonalScoreGuide from "@/components/score-guide/PersonalScoreGuide";
import CommercialScoreGuide from "@/components/score-guide/CommercialScoreGuide";
import HomeProfitabilityGuide from "@/components/score-guide/HomeProfitabilityGuide";
import PersonalProfitabilityGuide from "@/components/score-guide/PersonalProfitabilityGuide";
import CommercialProfitabilityGuide from "@/components/score-guide/CommercialProfitabilityGuide";

const SCORE_GUIDES = {
  home: HomeScoreGuide,
  personal: PersonalScoreGuide,
  commercial: CommercialScoreGuide,
};
const PROFITABILITY_GUIDES = {
  home: HomeProfitabilityGuide,
  personal: PersonalProfitabilityGuide,
  commercial: CommercialProfitabilityGuide,
};

export function GuidePage({ area }: { area: DemoArea }) {
  const Guide = SCORE_GUIDES[area];
  return (
    <ProductAreaShell area={area} canCreateQuote>
      <article data-guide>
        <Guide />
      </article>
    </ProductAreaShell>
  );
}

export function ProfitabilityGuidePage({ area }: { area: DemoArea }) {
  const Guide = PROFITABILITY_GUIDES[area];
  return (
    <ProductAreaShell area={area} canCreateQuote>
      <article data-guide>
        <Guide />
      </article>
    </ProductAreaShell>
  );
}
