'use client';

import { useState } from 'react';
import { simulateDrawAction, publishDrawAction } from '@/actions/draws';
import { DrawSimulationResult } from '@/lib/draw/types';

export function DrawAdminPanel() {
  const [simulation, setSimulation] = useState<DrawSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  async function handleSimulate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPublishSuccess(null);

    const formData = new FormData(e.currentTarget);
    const res = await simulateDrawAction(formData);

    if (res.error) {
      setError(res.error);
    } else {
      setSimulation(res.data);
    }
    setLoading(false);
  }

  async function handlePublish() {
    if (!simulation) return;
    if (!confirm('Are you sure you want to officially publish this draw? This will create permanent public records.')) {
      return;
    }

    setPublishLoading(true);
    setError(null);

    const res = await publishDrawAction(JSON.stringify(simulation));

    if (res.error) {
      setError(res.error);
    } else {
      setPublishSuccess(`Draw successfully published! (ID: ${res.drawId})`);
      setSimulation(null);
    }
    setPublishLoading(false);
  }

  const defaultPeriod = new Date().toISOString().substring(0, 7);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {publishSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm font-semibold">
          {publishSuccess}
        </div>
      )}

      {/* Draw Configuration & Simulation Form */}
      <form onSubmit={handleSimulate} className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <h3 className="text-lg font-bold border-b pb-2">Configure & Simulate Draw</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Draw Period (YYYY-MM)
            </label>
            <input
              name="draw_period"
              defaultValue={defaultPeriod}
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Draw Mode
            </label>
            <select name="draw_mode" className="w-full border rounded px-3 py-2 text-sm bg-white">
              <option value="random">Random (Standard Lottery)</option>
              <option value="algorithmic">Algorithmic (Score Consistency)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Custom Seed (Optional)
            </label>
            <input
              name="seed"
              placeholder="Leave blank for auto seed"
              className="w-full border rounded px-3 py-2 text-sm font-mono text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || publishLoading}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </form>

      {/* Simulation Results Preview */}
      {simulation && (
        <div className="bg-white p-6 rounded-lg border-2 border-indigo-200 shadow space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 gap-2">
            <div>
              <span className="inline-block px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-800 rounded">
                SIMULATION PREVIEW · NOT PUBLISHED
              </span>
              <h3 className="text-xl font-bold mt-1">
                Period {simulation.drawPeriod} ({simulation.drawMode})
              </h3>
              <p className="text-xs text-gray-500 font-mono">Seed: {simulation.seed}</p>
            </div>
            <button
              onClick={handlePublish}
              disabled={publishLoading}
              className="px-5 py-2.5 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm shadow"
            >
              {publishLoading ? 'Publishing...' : 'Publish Official Draw'}
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Active Subscribers</div>
              <div className="text-xl font-bold">{simulation.totalSubscribers}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Eligible Participants</div>
              <div className="text-xl font-bold">{simulation.eligibleParticipantCount}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Total Pool</div>
              <div className="text-xl font-bold font-mono text-green-700">
                £{(simulation.totalPoolCents / 100).toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Next Rollover</div>
              <div className="text-xl font-bold font-mono text-purple-700">
                £{(simulation.rolloverToNextJackpotCents / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Winning Numbers */}
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase mb-2">
              Generated Winning Numbers
            </div>
            <div className="flex gap-2">
              {simulation.winningNumbers.map((num, i) => (
                <span
                  key={i}
                  className="w-10 h-10 rounded-full bg-black text-white font-bold flex items-center justify-center font-mono text-base"
                >
                  {num}
                </span>
              ))}
            </div>
          </div>

          {/* Tier Outcomes */}
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase mb-2">
              Prize Tier Allocations
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tier 5 */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="font-bold flex justify-between">
                  <span>Tier 5 (40%)</span>
                  <span>{simulation.tiers.tier5.winners.length} winner(s)</span>
                </div>
                <div className="text-lg font-mono font-bold mt-1">
                  £{(simulation.tiers.tier5.totalAmountCents / 100).toFixed(2)}
                </div>
                {simulation.tiers.tier5.rolloverAmountCents > 0 && (
                  <div className="text-xs text-purple-600">
                    (+£{(simulation.tiers.tier5.rolloverAmountCents / 100).toFixed(2)} rolled over)
                  </div>
                )}
                <div className="text-xs text-gray-600 mt-2">
                  Payout per winner:{' '}
                  <strong>£{(simulation.tiers.tier5.prizePerWinnerCents / 100).toFixed(2)}</strong>
                </div>
              </div>

              {/* Tier 4 */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="font-bold flex justify-between">
                  <span>Tier 4 (35%)</span>
                  <span>{simulation.tiers.tier4.winners.length} winner(s)</span>
                </div>
                <div className="text-lg font-mono font-bold mt-1">
                  £{(simulation.tiers.tier4.totalAmountCents / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Payout per winner:{' '}
                  <strong>£{(simulation.tiers.tier4.prizePerWinnerCents / 100).toFixed(2)}</strong>
                </div>
              </div>

              {/* Tier 3 */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="font-bold flex justify-between">
                  <span>Tier 3 (25%)</span>
                  <span>{simulation.tiers.tier3.winners.length} winner(s)</span>
                </div>
                <div className="text-lg font-mono font-bold mt-1">
                  £{(simulation.tiers.tier3.totalAmountCents / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Payout per winner:{' '}
                  <strong>£{(simulation.tiers.tier3.prizePerWinnerCents / 100).toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
