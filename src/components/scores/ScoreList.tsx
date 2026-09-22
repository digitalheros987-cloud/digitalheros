'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteScore } from '@/actions/scores';
import { ScoreForm } from './ScoreForm';
import type { Score } from '@/lib/services/scores';
import { MAX_SCORES } from '@/lib/services/scores';

interface ScoreListProps {
  scores: Score[];
  targetUserId?: string;
}

export function ScoreList({ scores, targetUserId }: ScoreListProps) {
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(scoreId: string) {
    setDeleteError(null);
    const formData = new FormData();
    formData.set('id', scoreId);
    if (targetUserId) {
      formData.set('targetUserId', targetUserId);
    }
    const result = await deleteScore(formData);
    if (result?.error) {
      setDeleteError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Edit form overlay */}
      {editingScore && (
        <div className="mb-6">
          <ScoreForm
            editingScore={editingScore}
            onCancel={() => setEditingScore(null)}
            targetUserId={targetUserId}
          />
        </div>
      )}

      {deleteError && (
        <div className="p-4 text-sm font-bold uppercase tracking-widest text-white bg-brand-accent border-2 border-brand-text">
          {deleteError}
        </div>
      )}

      {/* Score count indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex gap-2">
          {Array.from({ length: MAX_SCORES }).map((_, i) => (
            <div 
              key={i} 
              className={`w-10 h-10 border-2 flex items-center justify-center font-display font-black text-lg ${
                i < scores.length ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-bg text-brand-muted border-brand-text'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <span className="font-bold text-sm uppercase tracking-widest text-brand-muted">
          {scores.length} / {MAX_SCORES} Active Scores
        </span>
      </div>

      <div className="border-2 border-brand-text bg-white divide-y-2 divide-brand-text">
        {scores.length === 0 ? (
          <div className="p-8 text-center bg-brand-bg">
            <span className="font-bold uppercase tracking-widest text-brand-muted">No scores logged yet.</span>
          </div>
        ) : (
          scores.map((score, index) => {
            const isCounted = index < MAX_SCORES;
            return (
              <div 
                key={score.id} 
                className={`p-4 sm:p-6 flex items-center justify-between transition-colors ${
                  isCounted ? 'bg-white hover:bg-brand-bg' : 'bg-brand-bg opacity-75'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 flex items-center justify-center border-2 border-brand-text ${isCounted ? 'bg-brand-primary text-white' : 'bg-white text-brand-muted'}`}>
                    <span className="font-display font-black text-3xl">{score.score_value}</span>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-widest text-brand-text mb-1">
                      {new Date(score.date_played).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                      {isCounted ? 'Active Entry' : 'Archived'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingScore(score)}
                    className="p-3 text-brand-text hover:text-brand-primary hover:bg-[#EAEAEA] border-2 border-transparent hover:border-brand-text transition-colors"
                    aria-label="Edit score"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(score.id)}
                    className="p-3 text-brand-text hover:text-white hover:bg-brand-accent border-2 border-transparent hover:border-brand-text transition-colors"
                    aria-label="Delete score"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
