export type HorizontalScrollMetrics = {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
};

export function horizontalScrollState(metrics: HorizontalScrollMetrics) {
  const maxScrollLeft = Math.max(0, metrics.scrollWidth - metrics.clientWidth);
  return {
    isOverflowing: maxScrollLeft > 1,
    canScrollLeft: metrics.scrollLeft > 1,
    canScrollRight: metrics.scrollLeft < maxScrollLeft - 1,
  };
}

export function activeTabScrollTarget(input: {
  tabLeft: number;
  tabWidth: number;
  scrollLeft: number;
  clientWidth: number;
}): number | null {
  const tabRight = input.tabLeft + input.tabWidth;
  const viewportRight = input.scrollLeft + input.clientWidth;
  if (input.tabLeft < input.scrollLeft) return input.tabLeft;
  if (tabRight > viewportRight) return tabRight - input.clientWidth;
  return null;
}

export function pagedScrollDistance(
  clientWidth: number,
  direction: -1 | 1,
): number {
  return direction * Math.max(120, clientWidth * 0.72);
}
