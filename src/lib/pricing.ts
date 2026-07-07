export type PlanPricing = {
  Monthly: number;
  Yearly: number;
  enabled: boolean;
};

export type PricingConfig = {
  Diamond: PlanPricing;
  Platinum: PlanPricing;
  Enterprise: PlanPricing;
};

export const DEFAULT_PRICING: PricingConfig = {
  Diamond: {
    Monthly: 249,
    Yearly: 2599,
    enabled: true
  },
  Platinum: {
    Monthly: 299,
    Yearly: 2999,
    enabled: true
  },
  Enterprise: {
    Monthly: 750,
    Yearly: 4999,
    enabled: true
  }
};
