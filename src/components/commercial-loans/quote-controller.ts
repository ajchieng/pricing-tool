import type { CommercialPricingResult } from "@/lib/pricing/commercial/types";

export type CommercialQuoteControllerState = {
  result: CommercialPricingResult | null;
  saving: boolean;
  retryToken: number;
};

export type CommercialQuoteControllerAction =
  | { type: "pricing_resolved"; result: CommercialPricingResult }
  | { type: "pricing_invalidated" }
  | { type: "save_started" }
  | { type: "save_finished" }
  | { type: "retry_requested" };

export const initialCommercialQuoteControllerState: CommercialQuoteControllerState =
  {
    result: null,
    saving: false,
    retryToken: 0,
  };

export function commercialQuoteControllerReducer(
  state: CommercialQuoteControllerState,
  action: CommercialQuoteControllerAction,
): CommercialQuoteControllerState {
  switch (action.type) {
    case "pricing_resolved":
      return { ...state, result: action.result };
    case "pricing_invalidated":
      return { ...state, result: null };
    case "save_started":
      return { ...state, saving: true };
    case "save_finished":
      return { ...state, saving: false };
    case "retry_requested":
      return { ...state, retryToken: state.retryToken + 1 };
  }
}
