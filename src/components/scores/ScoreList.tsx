'use client';

import { useState } from 'react';
import { deleteScore } from '@/actions/scores';
import { ScoreForm } from './ScoreForm';
import type { Score } from '@/lib/services/scores';
import { MAX_SCORES } from '@/lib/services/scores';

interface ScoreListProps {
  scores: Score[];
}

export function ScoreList({ scores }: ScoreListProps) {
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(scoreId: string) {
    setDeleteError(null);
    const formData = new FormData();
    formData.set('id', scoreId);
    const result = await deleteScore(formData);
    if (result?.error) {
      setDeleteError(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Edit form overlay */}
      {editingScore && (
        <ScoreForm
          editingScore={editingScore}
          onCancel={() => setEditingScore(null)}
        />
      )}

      {deleteError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded">
          {deleteError}
        </div>
      )}

      {/* Score count indicator */}
      <div className="text-sm text-gray-500">
        {scores.length} / {MAX_SCORES} scores entered
        {scores.length < MAX_SCORES && (
          <span className="ml-2 text-amber-600">
            (Need {MAX_SCORES} scores for draw eligibility)
          </span>
        )}
      </div>

      {scores.length === 0 ? (
        <p className="text-gray-400 italic py-4">No scores yet. Add your first Stableford score above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-3 text-sm font-semibold text-gray-600">#</th>
                <th className="py-2 px-3 text-sm font-semibold text-gray-600">Date Played</th>
                <th className="py-2 px-3 text-sm font-semibold text-gray-600">Stableford Score</th>
                <th className="py-2 px-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr
                  key={score.id}
                  className={`border-b ${index < MAX_SCORES ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                >
                  <td className="py-2 px-3 text-sm">
                    {index + 1}
                    {index < MAX_SCORES && (
                      <span className="ml-1 text-xs text-green-600 font-medium">★</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-sm">{score.date_played}</td>
                  <td className="py-2 px-3 text-sm font-mono font-semibold">{score.score_value}</td>
                  <td className="py-2 px-3 text-sm space-x-2">
                    <button
                      onClick={() => setEditingScore(score)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(score.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
