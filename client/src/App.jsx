import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Share2,
  ArrowLeft,
  Save,
  Trash2,
  Users,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from './api';
import RichTextEditor from './components/RichTextEditor';
import ShareModal from './components/ShareModal';

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(
    () => localStorage.getItem('ajaia_user_id') || 'user-alice'
  );
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | dirty
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const fileInputRef = useRef(null);

  const notify = (type, text) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  useEffect(() => {
    apiFetch('/api/users')
      .then(setUsers)
      .catch((err) => notify('error', err.message));
  }, []);

  const loadDocuments = async (uid = currentUserId) => {
    setLoading(true);
    try {
      const docs = await apiFetch('/api/documents', { userId: uid });
      setDocuments(docs);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('ajaia_user_id', currentUserId);
    setActiveDoc(null);
    loadDocuments(currentUserId);
  }, [currentUserId]);

  const openDocument = async (docId) => {
    try {
      const fullDoc = await apiFetch(`/api/documents/${docId}`, { userId: currentUserId });
      setActiveDoc(fullDoc);
      setDraftTitle(fullDoc.title);
      setDraftContent(fullDoc.content);
      setSaveState('idle');
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleCreateDoc = async () => {
    try {
      const created = await apiFetch('/api/documents', {
        userId: currentUserId,
        method: 'POST',
        body: { title: 'Untitled Document', content: '<p></p>' },
      });
      await openDocument(created.id);
      notify('success', 'Created new document');
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const imported = await apiFetch('/api/documents/import', {
        userId: currentUserId,
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      await openDocument(imported.id);
      notify('success', `Imported "${file.name}" as a new editable document`);
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleSave = async () => {
    if (!activeDoc) return;
    setSaveState('saving');
    try {
      const updated = await apiFetch(`/api/documents/${activeDoc.id}`, {
        userId: currentUserId,
        method: 'PATCH',
        body: { title: draftTitle, content: draftContent },
      });
      setActiveDoc((prev) => ({ ...prev, ...updated }));
      setSaveState('saved');
    } catch (err) {
      setSaveState('dirty');
      notify('error', err.message);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await apiFetch(`/api/documents/${docId}`, {
        userId: currentUserId,
        method: 'DELETE',
      });
      if (activeDoc?.id === docId) setActiveDoc(null);
      await loadDocuments();
      notify('success', 'Document deleted');
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleShare = async (targetUserId, permission) => {
    try {
      const shares = await apiFetch(`/api/documents/${activeDoc.id}/shares`, {
        userId: currentUserId,
        method: 'POST',
        body: { userId: targetUserId, permission },
      });
      setActiveDoc((prev) => ({ ...prev, shares }));
      notify('success', 'Access updated');
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleRevoke = async (targetUserId) => {
    try {
      await apiFetch(`/api/documents/${activeDoc.id}/shares/${targetUserId}`, {
        userId: currentUserId,
        method: 'DELETE',
      });
      setActiveDoc((prev) => ({
        ...prev,
        shares: prev.shares.filter((s) => s.user_id !== targetUserId),
      }));
      notify('success', 'Access revoked');
    } catch (err) {
      notify('error', err.message);
    }
  };

  const ownedDocs = documents.filter((d) => d.access_level === 'owner');
  const sharedDocs = documents.filter((d) => d.access_level !== 'owner');
  const canEdit = activeDoc?.access_level === 'owner' || activeDoc?.access_level === 'editor';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => {
              setActiveDoc(null);
              loadDocuments();
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Ajaia Docs</span>
              <span className="ml-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                Workspace
              </span>
            </div>
          </div>

          {/* Demo User Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Acting as:</span>
            <select
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.role_label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Notification Banner */}
      {banner && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${
              banner.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {banner.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {!activeDoc ? (
          /* DASHBOARD VIEW */
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Documents</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Create a blank doc or import <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">.md</code>,{' '}
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">.txt</code>, or{' '}
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">.docx</code> (max 2MB).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.docx"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  Import File
                </button>
                <button
                  onClick={handleCreateDoc}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Document
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading documents...</p>
            ) : (
              <>
                {/* My Documents */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    My Documents ({ownedDocs.length})
                  </h2>
                  {ownedDocs.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-500">
                      No documents yet. Click <strong>New Document</strong> or <strong>Import File</strong> to start.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ownedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => openDocument(doc.id)}
                          className="group bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 cursor-pointer transition shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                                {doc.title}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(doc.id);
                                }}
                                className="text-slate-300 hover:text-red-600 p-1"
                                title="Delete document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {doc.source_filename && (
                              <span className="inline-block mt-1.5 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                                Imported: {doc.source_filename}
                              </span>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span className="font-medium text-indigo-600">Owner</span>
                            <span>Updated {new Date(doc.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Shared with Me */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Shared with Me ({sharedDocs.length})
                  </h2>
                  {sharedDocs.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                      No documents have been shared with you yet. Switch users in the top-right to share a doc!
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sharedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => openDocument(doc.id)}
                          className="group bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 cursor-pointer transition shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                              {doc.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Owner: {doc.owner_name}</p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-full font-medium capitalize ${
                                doc.access_level === 'editor'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {doc.access_level}
                            </span>
                            <span className="text-slate-400">
                              {new Date(doc.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        ) : (
          /* EDITOR VIEW */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <button
                  onClick={() => {
                    setActiveDoc(null);
                    loadDocuments();
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                  title="Back to documents"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={draftTitle}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setSaveState('dirty');
                  }}
                  placeholder="Document title..."
                  className="text-lg font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-full disabled:opacity-75"
                />
              </div>

              <div className="flex items-center gap-3">
                {!canEdit && (
                  <span className="flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">
                    <Lock className="w-3.5 h-3.5" />
                    View Only
                  </span>
                )}

                {canEdit && (
                  <>
                    <span className="text-xs text-slate-400">
                      {saveState === 'saving' && 'Saving...'}
                      {saveState === 'saved' && 'All changes saved'}
                      {saveState === 'dirty' && 'Unsaved changes'}
                    </span>
                    <button
                      onClick={handleSave}
                      disabled={saveState === 'saving'}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </>
                )}

                {activeDoc.access_level === 'owner' && (
                  <button
                    onClick={() => setShareOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    Share ({activeDoc.shares?.length || 0})
                  </button>
                )}
              </div>
            </div>

            <RichTextEditor
              content={draftContent}
              editable={canEdit}
              onChange={(html) => {
                setDraftContent(html);
                setSaveState('dirty');
              }}
            />
          </div>
        )}
      </main>

      {shareOpen && activeDoc && (
        <ShareModal
          doc={activeDoc}
          allUsers={users}
          currentUserId={currentUserId}
          onClose={() => setShareOpen(false)}
          onShare={handleShare}
          onRevoke={handleRevoke}
        />
      )}
    </div>
  );
}