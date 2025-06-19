'use client';

// MARK: PricingSection component extracted from PricingPage to embed on Landing Page

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { auth } from '@/lib/firebase';
import {
  getPricingInfo,
  formatPrice,
  calculateSavings,
  SubscriptionPlan,
  SubscriptionTier,
  PricingInfo,
} from '@/utils/subscriptionUtils';

export default function PricingSection() {
  const router = useRouter();
  const { withErrorHandling } = useErrorHandler({ title: 'Pricing Error' });

  const [isYearly, setIsYearly] = useState(false);
  const [pricingData, setPricingData] = useState<PricingInfo[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Observe auth state for conditional routing
    const unsubscribe = auth.onAuthStateChanged((user) => setIsAuthenticated(!!user));

    // Load pricing definitions
    setPricingData(getPricingInfo());

    return () => unsubscribe();
  }, []);

  const handleSelectPlan = withErrorHandling(async (plan: SubscriptionPlan, tier?: SubscriptionTier) => {
    if (!isAuthenticated) {
      // Persist choice so we can pre-select at checkout after sign-up
      sessionStorage.setItem(
        'selectedPlan',
        JSON.stringify({ plan, tier, interval: isYearly ? 'year' : 'month' })
      );
      router.push('/signup?redirect=/checkout');
      return;
    }

    const params = new URLSearchParams({
      plan,
      ...(tier && { tier }),
      interval: isYearly ? 'year' : 'month',
    });
    router.push(`/checkout?${params.toString()}`);
  });

  const getPlanKey = (plan: SubscriptionPlan, tier?: SubscriptionTier) => (tier ? `${plan}-${tier}` : plan);

  return (
    <section id="pricing" className="bg-gray-50">
      {/* Intro */}
      <section className="bg-gradient-to-b from-white to-gray-50 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Dynasty Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Preserve your family&apos;s legacy with secure storage, advanced features, and unlimited memories
            </p>

            {/* Billing interval toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <Label htmlFor="billing-toggle" className="text-base font-medium text-gray-700">
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-[#0A5C36]"
              />
              <Label htmlFor="billing-toggle" className="text-base font-medium text-gray-700">
                Yearly
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                  Save up to 20%
                </Badge>
              </Label>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {pricingData.map((pricing) => {
              const planKey = getPlanKey(pricing.plan, pricing.tier);
              const price = isYearly ? pricing.yearlyPrice : pricing.monthlyPrice;
              const savings =
                isYearly && pricing.monthlyPrice > 0
                  ? calculateSavings(pricing.monthlyPrice, pricing.yearlyPrice)
                  : 0;

              return (
                <Card
                  key={planKey}
                  className={`relative transition-all duration-200 hover:shadow-lg ${
                    pricing.recommended ? 'ring-2 ring-[#0A5C36] shadow-lg' : ''
                  }`}
                >
                  {pricing.recommended && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-[#0A5C36] text-white flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Recommended
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl capitalize">
                      {pricing.plan === SubscriptionPlan.INDIVIDUAL && pricing.tier
                        ? `${pricing.plan} ${pricing.tier}`
                        : pricing.plan}
                    </CardTitle>
                    <CardDescription>
                      {pricing.familyMembers
                        ? `For families up to ${pricing.familyMembers} members`
                        : `${pricing.storageGB}GB storage included`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">{formatPrice(price)}</span>
                        {price > 0 && (
                          <span className="text-gray-500 ml-1">/{isYearly ? 'year' : 'month'}</span>
                        )}
                      </div>
                      {isYearly && savings > 0 && (
                        <p className="text-sm text-green-600">Save {savings}% with yearly billing</p>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {pricing.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      variant={pricing.recommended ? 'default' : 'outline'}
                      className="w-full"
                      size="lg"
                      onClick={() => handleSelectPlan(pricing.plan, pricing.tier)}
                    >
                      {pricing.plan === SubscriptionPlan.FREE ? 'Get Started' : 'Choose Plan'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Preserving Memories?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of families who trust Dynasty to keep their stories safe
          </p>
          <Button
            size="lg"
            className="bg-[#0A5C36] hover:bg-[#0A5C36]/90"
            onClick={() => router.push(isAuthenticated ? '/checkout' : '/signup')}
          >
            Get Started Today
          </Button>
        </div>
      </section>
    </section>
  );
} 