import { useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';

export default function ShareModal({ doc, allUsers, currentUserId, onClose, onShare, onRevoke }) {
  const availableUsers = allUsers.filter((u) => u.id !== currentUserId);
  const [selectedUserId, setSelectedUserId] = useState(availableUsers[0]?.id || '');
  const [permission, setPermission] = useState('editor');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setSubmitting(true);
    try {
      await onShare(selectedUserId, permission);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Share "{doc.title}"</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>

          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-2 text-sm"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>

          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Grant
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            People with access
          </p>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 text-sm">
            <div>
              <p className="font-medium text-slate-800">{doc.owner_name}</p>
              <p className="text-xs text-slate-500">{doc.owner_email}</p>
            </div>
            <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
              Owner
            </span>
          </div>

          {doc.shares?.length === 0 && (
            <p className="text-sm text-slate-400 py-2">Not shared with anyone yet.</p>
          )}

          {doc.shares?.map((s) => (
            <div
              key={s.user_id}
              className="flex items-center justify-between py-2 border-b border-slate-100 text-sm"
            >
              <div>
                <p className="font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-500">{s.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full capitalize">
                  {s.permission}
                </span>
                <button
                  onClick={() => onRevoke(s.user_id)}
                  className="text-slate-400 hover:text-red-600 p-1"
                  title="Revoke access"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}