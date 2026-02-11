'use client';

import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminSyncUsers() {
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const syncUsers = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const { data } = await axios.post(
        '/api/admin/sync-clerk-users',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(data);
      toast.success(`Synced ${data.synced} users!`);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'Failed to sync users');
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sync Clerk Users to Database</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-4">
            This will sync all users from your Clerk account to the database, ensuring customer names and emails appear correctly in orders.
          </p>

          <button
            onClick={syncUsers}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Syncing...' : 'Sync All Clerk Users'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Sync Results</h2>
            <div className="space-y-2 text-gray-700">
              <p><span className="font-semibold">Synced:</span> {result.synced} users</p>
              <p><span className="font-semibold">Skipped:</span> {result.skipped} users</p>
              {result.errors?.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded border border-red-200">
                  <p className="font-semibold text-red-700 mb-2">Errors:</p>
                  <ul className="text-red-600 text-sm space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err.userId}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
