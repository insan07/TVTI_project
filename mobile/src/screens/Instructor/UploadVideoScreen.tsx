import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import VideosScreen from '../Student/VideosScreen';
import InstructorUploadForm from '../../components/shared/InstructorUploadForm';
import ManagementDialog from '../../components/shared/ManagementDialog';
import api from '../../services/api';

export default function UploadVideoScreen() {
  const route = useRoute<any>();
  const [uploadOpen, setUploadOpen] = useState(route.params?.tab === 'upload');
  const [initialBatch, setInitialBatch] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState<any>(null), [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => { if (route.params?.tab) setUploadOpen(route.params.tab === 'upload'); }, [route.params]);
  const remove = async () => {
    if (!deleting || busy) return; setBusy(true);
    try { await api.delete('/instructors/videos/' + deleting._id); setDeleting(null); setRefreshKey(value => value + 1); setFeedback({ title: 'Upload deleted', message: 'The upload has been removed from the course library.', type: 'success' }); }
    catch (error: any) { setDeleting(null); setFeedback({ title: 'Unable to delete', message: error.response?.data?.message || 'The upload could not be deleted. Please try again.', type: 'error' }); }
    finally { setBusy(false); }
  };
  return <>
    <VideosScreen instructor refreshKey={refreshKey} selectedBatchId={initialBatch} onAdd={batch => { setInitialBatch(batch); setUploadOpen(true); }} onDelete={setDeleting} />
    {uploadOpen && <InstructorUploadForm initialBatch={initialBatch} onClose={() => setUploadOpen(false)} onSaved={batch => { setInitialBatch(batch); setUploadOpen(false); setRefreshKey(value => value + 1); }} />}
    <ManagementDialog visible={!!deleting} title="Delete upload?" message={deleting ? 'Remove “' + deleting.title + '” from this course? This cannot be undone.' : ''} type="danger" busy={busy} confirmText="Delete" onConfirm={() => { void remove(); }} onCancel={() => { if (!busy) setDeleting(null); }} />
    <ManagementDialog visible={!!feedback} title={feedback?.title || ''} message={feedback?.message || ''} type={feedback?.type || 'success'} onConfirm={() => setFeedback(null)} />
  </>;
}
