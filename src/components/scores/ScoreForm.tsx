'use client';

import { useState } from 'react';
import { addScore, updateScore } from '@/actions/scores';
import type { Score } from '@/lib/services/scores';

interface ScoreFormProps {
  /** If provided, the form is in "edit" mode for this score. */
  editingScore?: Score | null;
  /** Callback to cancel editing. */
  onCancel?: () => void;
  /** Target user ID for adding scores on behalf of another user. */
  targetUserId?: string;
}

export function ScoreForm({ editingScore, onCancel, targetUserId }: ScoreFormProps) {
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

    if (targetUserId) {
      formData.set('targetUserId', targetUserId);
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
      className="flex flex-col gap-6 p-6 md:p-8 bg-brand-bg border-2 border-brand-text relative"
    >
      <div className="flex items-center justify-between border-b-2 border-brand-text pb-4">
        <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-brand-text">
          {isEditing ? 'Edit Score' : 'Log Score'}
        </h3>
      </div>

      {error && (
        <div className="p-4 text-sm font-bold uppercase tracking-widest text-white bg-brand-accent border-2 border-brand-text" data-testid="score-error">
          {error}
        </div>
      )}

      {success && !isEditing && (
        <div className="p-4 text-sm font-bold uppercase tracking-widest text-white bg-brand-primary border-2 border-brand-text" data-testid="score-success">
          {success}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-2">
          <label htmlFor="score_value" className="text-sm font-bold uppercase tracking-widest text-brand-text">
            Stableford Score
          </label>
          <input
            id="score_value"
            name="score_value"
            type="number"
            min="0"
            max="100"
            required
            defaultValue={isEditing ? editingScore.score_value : ''}
            className="w-full px-4 py-4 font-display font-black text-3xl bg-white border-2 border-brand-text focus:outline-none focus:ring-0 focus:border-brand-primary placeholder:text-brand-muted/30"
            placeholder="e.g. 36"
          />
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <label htmlFor="date_played" className="text-sm font-bold uppercase tracking-widest text-brand-text">
            Date Played
          </label>
          <input
            id="date_played"
            name="date_played"
            type="date"
            required
            defaultValue={isEditing ? editingScore.date_played : new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-4 font-display font-black text-xl md:text-2xl bg-white border-2 border-brand-text focus:outline-none focus:ring-0 focus:border-brand-primary"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 mt-2">
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Submit Score')}
        </button>
      </div>
    </form>
  );
}
