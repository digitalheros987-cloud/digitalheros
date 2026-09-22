'use client';

import { useState } from 'react';
import { addCharity, updateCharity, deleteCharity } from '@/actions/admin-charities';
import { Charity } from '@/lib/services/charities';

export function AdminCharityTable({ charities }: { charities: Charity[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await addCharity(new FormData(e.currentTarget));
    if (res?.error) setError(res.error);
    else setIsAdding(false);
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await updateCharity(new FormData(e.currentTarget));
    if (res?.error) setError(res.error);
    else setEditingId(null);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this charity? If it is selected by users, this will fail.')) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('id', id);
    const res = await deleteCharity(formData);
    if (res?.error) setError(res.error);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-800 transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add Charity'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-slate-50 p-6 rounded border border-slate-200 mb-6 grid gap-4">
          <h3 className="font-bold text-slate-900">Add New Charity</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" name="name" required className="w-full border-slate-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" required rows={3} className="w-full border-slate-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
            <input type="url" name="image_url" placeholder="https://" className="w-full border-slate-300 rounded p-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Upcoming Events</label>
              <textarea name="upcoming_events" rows={2} className="w-full border-slate-300 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Golf Charity Events</label>
              <textarea name="golf_events" rows={2} className="w-full border-slate-300 rounded p-2" />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" value="true" defaultChecked />
              Active (Visible to users)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_spotlight" value="true" />
              Spotlight (Featured)
            </label>
          </div>
          <button type="submit" disabled={loading} className="w-fit px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Charity'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4 w-1/2">Description</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {charities.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                {editingId === c.id ? (
                  <td colSpan={4} className="p-0">
                    <form onSubmit={handleUpdate} className="p-4 grid gap-4 bg-blue-50">
                      <input type="hidden" name="id" value={c.id} />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                          <input type="text" name="name" defaultValue={c.name} required className="w-full border-slate-300 rounded p-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                          <input type="url" name="image_url" defaultValue={c.image_url || ''} className="w-full border-slate-300 rounded p-2 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                        <textarea name="description" defaultValue={c.description} required rows={2} className="w-full border-slate-300 rounded p-2 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Upcoming Events</label>
                          <textarea name="upcoming_events" defaultValue={c.upcoming_events || ''} rows={2} className="w-full border-slate-300 rounded p-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Golf Charity Events</label>
                          <textarea name="golf_events" defaultValue={c.golf_events || ''} rows={2} className="w-full border-slate-300 rounded p-2 text-sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 py-2 border-t border-blue-100 mt-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" name="is_active" value="true" defaultChecked={c.is_active} />
                          Active
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" name="is_spotlight" value="true" defaultChecked={c.is_spotlight} />
                          Spotlight
                        </label>
                        <div className="ml-auto flex gap-2">
                          <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 text-slate-600 hover:text-slate-800">Cancel</button>
                          <button type="submit" disabled={loading} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                        </div>
                      </div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{c.description}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {c.is_spotlight && (
                        <span className="ml-1 px-2 py-1 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-800">Spotlight</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => setEditingId(c.id)} className="text-blue-600 hover:underline text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline text-xs font-medium">Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {charities.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 italic">No charities found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
