'use client';

import { useState } from 'react';
import { createSimulatedSubscription, cancelSimulatedSubscription } from '@/actions/subscriptions';
import type { Subscription } from '@/lib/services/subscriptions';

interface SubscriptionManagerProps {
  subscription: Subscription | null;
  isActive: boolean;
}

export function SubscriptionManager({ subscription, isActive }: SubscriptionManagerProps) {
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

    const result = await cancelSimulatedSubscription();

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess('Subscription canceled successfully.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded" data-testid="subscription-error">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded" data-testid="subscription-success">
          {success}
        </div>
      )}

      {/* DEV WARNING */}
      <div className="p-4 bg-yellow-50 border border-yellow-400 rounded text-yellow-800 text-sm flex flex-col gap-2">
        <strong className="flex items-center gap-2">
          <span>⚠️</span> Development Simulator Active
        </strong>
        <p>
          This application is currently in development mode. No real payments are processed.
          Stripe will be integrated in a later phase.
        </p>
      </div>

      {isActive && subscription ? (
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Subscription: <span className="text-green-600">Active</span>
          </h2>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Plan Type</dt>
              <dd className="text-lg capitalize">{subscription.plan}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Provider</dt>
              <dd className="text-lg capitalize text-gray-700">{subscription.provider}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Current Period Start</dt>
              <dd className="text-lg">{new Date(subscription.current_period_start).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Current Period End</dt>
              <dd className="text-lg">{new Date(subscription.current_period_end).toLocaleDateString()}</dd>
            </div>
          </dl>

          {subscription.status === 'active' ? (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Cancel Subscription'}
            </button>
          ) : (
            <p className="text-amber-600 text-sm font-medium">
              Your subscription is canceled but remains active until the end of the billing period.
            </p>
          )}
        </div>
      ) : (
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4">Your subscription is currently inactive.</h2>
          <p className="text-gray-600 mb-6">
            Subscribe to Digital Heroes to enter our monthly draws and support your selected charity.
          </p>

          <form onSubmit={handleSimulatePayment} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer ${selectedPlan === 'monthly' ? 'border-black bg-gray-50' : 'border-gray-200'
                  }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  checked={selectedPlan === 'monthly'}
                  onChange={() => setSelectedPlan('monthly')}
                  className="sr-only"
                />
                <span className="text-lg font-bold">Monthly Plan</span>
                <span className="text-gray-600">£9.99 / month</span>
              </label>

              <label
                className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer ${selectedPlan === 'yearly' ? 'border-black bg-gray-50' : 'border-gray-200'
                  }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value="yearly"
                  checked={selectedPlan === 'yearly'}
                  onChange={() => setSelectedPlan('yearly')}
                  className="sr-only"
                />
                <span className="text-lg font-bold">Yearly Plan</span>
                <span className="text-gray-600">£99.90 / year (Save 16%)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-black text-white font-bold rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Simulate Payment'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
