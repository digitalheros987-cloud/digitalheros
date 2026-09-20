'use client';

import { useState } from 'react';
import { selectCharity } from '@/actions/charities';
import type { Charity, UserCharitySelection } from '@/lib/services/charities';

interface CharityListProps {
  charities: Charity[];
  currentSelection: (UserCharitySelection & { charity: Charity }) | null;
}

export function CharityList({ charities, currentSelection }: CharityListProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(currentSelection?.charity_id ?? '');
  const [percentage, setPercentage] = useState<number>(currentSelection?.contribution_percentage ?? 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set('charity_id', selectedId);
    formData.set('contribution_percentage', percentage.toString());

    const result = await selectCharity(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess('Charity selection saved successfully!');
    }
    setLoading(false);
  }

  if (charities.length === 0) {
    return (
      <p className="text-gray-400 italic py-4">
        No charities are currently available. Please check back later.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Selection */}
      {currentSelection && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-semibold text-green-800">Your Current Selection</h3>
          <p className="text-lg font-bold text-green-900">{currentSelection.charity.name}</p>
          <p className="text-sm text-green-700">
            Contribution: {currentSelection.contribution_percentage}%
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded" data-testid="charity-error">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded" data-testid="charity-success">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Charity Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {charities.map((charity) => (
            <label
              key={charity.id}
              className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${selectedId === charity.id
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'
                }`}
            >
              <input
                type="radio"
                name="charity_id"
                value={charity.id}
                checked={selectedId === charity.id}
                onChange={() => setSelectedId(charity.id)}
                className="sr-only"
              />
              <span className="text-lg font-semibold">{charity.name}</span>
              <span className="text-sm text-gray-600 mt-1">{charity.description}</span>
              {charity.is_spotlight && (
                <span className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full w-fit">
                  ⭐ Spotlight
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Contribution Percentage */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="contribution_percentage">
            Contribution Percentage (10%–100%)
          </label>
          <input
            id="contribution_percentage"
            name="contribution_percentage"
            type="number"
            min={10}
            max={100}
            step={1}
            value={percentage}
            onChange={(e) => setPercentage(parseInt(e.target.value, 10) || 10)}
            className="w-32 p-2 border rounded"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !selectedId}
          className="px-6 py-2 bg-black text-white rounded disabled:bg-gray-400"
        >
          {loading
            ? 'Saving...'
            : currentSelection
              ? 'Update Selection'
              : 'Select Charity'}
        </button>
      </form>
    </div>
  );
}
