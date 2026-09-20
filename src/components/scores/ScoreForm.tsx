'use client';

import { useState } from 'react';
import { addScore, updateScore } from '@/actions/scores';
import type { Score } from '@/lib/services/scores';

interface ScoreFormProps {
  /** If provided, the form is in "edit" mode for this score. */
  editingScore?: Score | null;
  /** Callback to cancel editing. */
  onCancel?: () => void;
}

export function ScoreForm({ editingScore, onCancel }: ScoreFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = !!editingScore;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (isEditing) {
      formData.set('id', editingScore!.id);
    }

    const action = isEditing ? updateScore : addScore;
    const result = await action(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(isEditing ? 'Score updated.' : 'Score added.');
      setLoading(false);
      if (onCancel) onCancel();
    }
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md border"
    >
      <h3 className="text-lg font-semibold">
        {isEditing ? 'Edit Score' : 'Add New Score'}
      </h3>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded" data-testid="score-error">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded" data-testid="score-success">
          {success}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" htmlFor="score_value">
            Stableford Score (1–45)
          </label>
          <input
            id="score_value"
            name="score_value"
            type="number"
            min={1}
            max={45}
            step={1}
            required
            defaultValue={editingScore?.score_value ?? ''}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" htmlFor="date_played">
            Date Played
          </label>
          <input
            id="date_played"
            name="date_played"
            type="date"
            required
            defaultValue={editingScore?.date_played ?? ''}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Score' : 'Add Score'}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-black rounded"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
