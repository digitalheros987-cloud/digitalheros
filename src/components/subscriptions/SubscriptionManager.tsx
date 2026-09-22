'use client';

import { useState } from 'react';
import { createSimulatedSubscription, cancelSimulatedSubscription } from '@/actions/subscriptions';
import type { Subscription } from '@/lib/services/subscriptions';
import { formatFullDate } from '@/lib/utils/date';

interface SubscriptionManagerProps {
  subscription: Subscription | null;
  isActive: boolean;
  targetUserId?: string;
}

export function SubscriptionManager({ subscription, isActive, targetUserId }: SubscriptionManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  async function handleSimulatePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set('plan', selectedPlan);
    if (targetUserId) formData.set('targetUserId', targetUserId);

    const result = await createSimulatedSubscription(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess('Simulated payment successful! Subscription active.');
    }
    setLoading(false);
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel your simulated subscription?')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    if (subscription?.id) {
      formData.set('subscription_id', subscription.id);
    }
    if (targetUserId) {
      formData.set('targetUserId', targetUserId);
    }

    const result = await cancelSimulatedSubscription(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess('Subscription canceled successfully.');
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6 relative">
      {error && (
        <div className="p-4 text-sm font-bold uppercase tracking-widest text-white bg-brand-accent border-2 border-brand-text">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 text-sm font-bold uppercase tracking-widest text-white bg-brand-primary border-2 border-brand-text">
          {success}
        </div>
      )}

      {isActive ? (
        <div className="flex flex-col gap-6">
          <div className="p-6 bg-brand-bg border-2 border-brand-text">
            <div className="flex items-center justify-between mb-6 border-b-2 border-brand-text pb-4">
              <span className="font-bold uppercase tracking-widest text-brand-muted">Current Plan</span>
              <span className="px-3 py-1 bg-brand-primary text-white text-xs font-bold uppercase tracking-widest border-2 border-brand-primary">Active</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-display font-black text-3xl uppercase tracking-tighter">Digital Heroes <span className="capitalize">{subscription?.plan_type || 'Monthly'}</span></h3>
              <p className="font-bold text-brand-muted">
                Valid until {formatFullDate(subscription?.current_period_end || '')}
              </p>
            </div>
          </div>
          
          <div className="flex justify-start">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-sm font-bold uppercase tracking-widest text-brand-accent underline decoration-2 underline-offset-4 hover:text-brand-primary transition-colors"
            >
              {loading ? 'Processing...' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="p-6 bg-brand-accent text-white border-2 border-brand-text">
            <h3 className="font-display font-black text-3xl uppercase tracking-tighter mb-2">Activate Your Account</h3>
            <p className="font-bold text-white/80">
              An active subscription is required to enter official draws and win prizes.
            </p>
          </div>

          <form onSubmit={handleSimulatePayment} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <span className="font-bold uppercase tracking-widest text-sm text-brand-muted">Select Plan</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`cursor-pointer border-2 p-6 flex flex-col gap-2 transition-colors ${
                  selectedPlan === 'monthly' ? 'border-brand-text bg-white' : 'border-transparent bg-brand-bg opacity-70 hover:opacity-100'
                }`}>
                  <input
                    type="radio"
                    name="plan"
                    value="monthly"
                    checked={selectedPlan === 'monthly'}
                    onChange={(e) => setSelectedPlan(e.target.value as 'monthly' | 'yearly')}
                    className="sr-only"
                  />
                  <span className="font-display font-black text-2xl uppercase tracking-tighter text-brand-text">Monthly</span>
                  <span className="font-bold text-brand-primary">£10.00 / month</span>
                </label>

                <label className={`cursor-pointer border-2 p-6 flex flex-col gap-2 transition-colors ${
                  selectedPlan === 'yearly' ? 'border-brand-text bg-white' : 'border-transparent bg-brand-bg opacity-70 hover:opacity-100'
                }`}>
                  <input
                    type="radio"
                    name="plan"
                    value="yearly"
                    checked={selectedPlan === 'yearly'}
                    onChange={(e) => setSelectedPlan(e.target.value as 'monthly' | 'yearly')}
                    className="sr-only"
                  />
                  <span className="font-display font-black text-2xl uppercase tracking-tighter text-brand-text">Yearly</span>
                  <span className="font-bold text-brand-primary">£100.00 / year</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-accent mt-1">Save 17%</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto self-start"
            >
              {loading ? 'Processing...' : 'Simulate Payment'}
            </button>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">
              (This is a simulated payment for demo purposes. No real charges are made.)
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
