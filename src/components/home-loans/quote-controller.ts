import type { PricingResult } from "@/lib/pricing/types";

export type HomeQuoteControllerState = {
  result: PricingResult | null;
  saving: boolean;
  retryToken: number;
};

export type HomeQuoteControllerAction =
  | { type: "pricing_resolved"; result: PricingResult }
  | { type: "pricing_invalidated" }
  | { type: "save_started" }
  | { type: "save_finished" }
  | { type: "retry_requested" };

export const initialHomeQuoteControllerState: HomeQuoteControllerState = {
  result: null,
  saving: false,
  retryToken: 0,
};

export function homeQuoteControllerReducer(
  state: HomeQuoteControllerState,
  action: HomeQuoteControllerAction,
): HomeQuoteControllerState {
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
