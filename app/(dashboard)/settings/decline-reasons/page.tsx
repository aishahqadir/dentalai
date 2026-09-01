'use client';

import { useEffect, useState } from 'react';

interface DeclineReason {
  id: number;
  code: string;
  label: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function DeclineReasonsPage() {
  const [reasons, setReasons] = useState<DeclineReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<DeclineReason>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchReasons();
  }, []);

  async function fetchReasons() {
    try {
      setLoading(true);
      const res = await fetch('/api/decline-reasons');
      if (!res.ok) throw new Error('Failed to fetch decline reasons');
      const data = await res.json();
      setReasons(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading decline reasons');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(id: number, currentState: boolean) {
    try {
      const res = await fetch('/api/decline-reasons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentState }),
      });
      if (!res.ok) throw new Error('Failed to update decline reason');
      const updated = await res.json();
      setReasons((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setSuccess(`Decline reason ${!currentState ? 'activated' : 'deactivated'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating decline reason');
    }
  }

  async function handleSaveEdit(id: number) {
    try {
      const res = await fetch('/api/decline-reasons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editValues }),
      });
      if (!res.ok) throw new Error('Failed to save decline reason');
      const updated = await res.json();
      setReasons((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditing(null);
      setEditValues({});
      setSuccess('Decline reason saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving decline reason');
    }
  }

  if (loading) return <div className="p-4">Loading decline reasons...</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Decline Reasons</h1>
        <p className="text-gray-600 text-sm mt-2">
          Manage the reasons patients can decline treatment. These appear in the treatment plan workflow.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Code</th>
              <th className="px-4 py-3 text-left font-semibold">Label</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
              <th className="px-4 py-3 text-center font-semibold">Active</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((reason) => (
              <tr key={reason.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{reason.code}</code>
                </td>
                <td className="px-4 py-3">
                  {editing === reason.id ? (
                    <input
                      type="text"
                      value={editValues.label || reason.label}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          label: e.target.value,
                        }))
                      }
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    reason.label
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing === reason.id ? (
                    <textarea
                      value={editValues.description || reason.description}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="border rounded px-2 py-1 w-full text-xs"
                      rows={2}
                    />
                  ) : (
                    <span className="text-gray-600 text-xs">{reason.description}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(reason.id, reason.is_active)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      reason.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {reason.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editing === reason.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(reason.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditing(null);
                          setEditValues({});
                        }}
                        className="text-gray-600 hover:text-gray-800 font-medium text-xs"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditing(reason.id);
                        setEditValues(reason);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">Notes:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>To add a new decline reason, contact support or submit a request.</li>
          <li>Deactivating a reason keeps historical data intact but removes it from new forms.</li>
          <li>The <code className="bg-blue-100 px-1">code</code> field is immutable (used internally).</li>
        </ul>
      </div>
    </div>
  );
}
