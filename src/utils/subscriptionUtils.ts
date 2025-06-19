// MARK: Subscription Utilities

export enum SubscriptionPlan {
  FREE = "free",
  INDIVIDUAL = "individual",
  FAMILY = "family",
}

export enum SubscriptionTier {
  BASIC = "basic",
  PLUS = "plus",
}

export interface PricingInfo {
  plan: SubscriptionPlan;
  tier?: SubscriptionTier;
  storageGB: number;
  monthlyPrice: number; // USD
  yearlyPrice: number; // USD – should represent 1 year of service
  familyMembers?: number;
  recommended?: boolean;
  features: string[];
}

/**
 * Hard-coded pricing table for now. Ideally this would come from your payment
 * backend (e.g., Stripe) via an API call or env-controlled JSON.
 */
export function getPricingInfo(): PricingInfo[] {
  return [
    {
      plan: SubscriptionPlan.FREE,
      storageGB: 5,
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        "Basic family tree",
        "Limited photo uploads",
        "Community support",
      ],
      recommended: false,
    },
    {
      plan: SubscriptionPlan.INDIVIDUAL,
      tier: SubscriptionTier.BASIC,
      storageGB: 50,
      monthlyPrice: 4.99,
      yearlyPrice: 49.99,
      features: [
        "50 GB secure storage",
        "Unlimited stories",
        "Priority support",
      ],
    },
    {
      plan: SubscriptionPlan.INDIVIDUAL,
      tier: SubscriptionTier.PLUS,
      storageGB: 200,
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      features: [
        "200 GB secure storage",
        "AI photo enhancements",
        "Priority support",
      ],
      recommended: true,
    },
    {
      plan: SubscriptionPlan.FAMILY,
      storageGB: 1000,
      familyMembers: 6,
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      features: [
        "1 TB secure storage",
        "Up to 6 premium accounts",
        "Share with unlimited relatives",
      ],
    },
  ];
}

export function formatPrice(amount: number): string {
  return amount === 0
    ? "Free"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
}

export function calculateSavings(monthly: number, yearly: number): number {
  if (monthly === 0) return 0;
  const costForYear = monthly * 12;
  return Math.round(((costForYear - yearly) / costForYear) * 100);
} 