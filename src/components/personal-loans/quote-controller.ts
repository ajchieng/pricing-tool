import type { PersonalPricingResult } from "@/lib/pricing/personal/types";

export type PersonalQuoteControllerState = {
  result: PersonalPricingResult | null;
  saving: boolean;
  retryToken: number;
};

export type PersonalQuoteControllerAction =
  | { type: "pricing_resolved"; result: PersonalPricingResult }
  | { type: "pricing_invalidated" }
  | { type: "save_started" }
  | { type: "save_finished" }
  | { type: "retry_requested" };

export const initialPersonalQuoteControllerState: PersonalQuoteControllerState =
  {
    result: null,
    saving: false,
    retryToken: 0,
  };

export function personalQuoteControllerReducer(
  state: PersonalQuoteControllerState,
  action: PersonalQuoteControllerAction,
): PersonalQuoteControllerState {
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
