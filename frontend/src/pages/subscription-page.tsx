import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSubscription, updateSubscription } from '../lib/services';
import { useOrgUuid, usePermissions } from '../hooks/redux';
import { PageHeader } from '../components/responsive-data';

export function SubscriptionPage() {
  const orgUuid = useOrgUuid();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [plan, setPlan] = useState('starter');
  const [status, setStatus] = useState('active');
  const [seats, setSeats] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', orgUuid],
    queryFn: () => fetchSubscription(orgUuid!),
    enabled: Boolean(orgUuid) && hasPermission('subscription:manage'),
  });

  useEffect(() => {
    if (subscriptionQuery.data) {
      setPlan(subscriptionQuery.data.plan);
      setStatus(subscriptionQuery.data.status);
      setSeats(subscriptionQuery.data.seats);
    }
  }, [subscriptionQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updateSubscription(orgUuid!, { plan, status, seats }),
    onSuccess: () => {
      setMessage('Subscription updated');
      queryClient.invalidateQueries({ queryKey: ['subscription', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!orgUuid) {
    return <p className="text-slate-500">Select an organization to manage subscription.</p>;
  }

  if (!hasPermission('subscription:manage')) {
    return <p className="text-slate-500">You do not have permission to manage the subscription.</p>;
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    saveMutation.mutate();
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Subscription"
        description="Managed by the organization subscriber (and admins)."
      />

      <form
        onSubmit={onSave}
        className="w-full max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:rounded-2xl sm:p-5"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Plan</span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="starter">Starter</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Status</span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Seats</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
        </label>

        {subscriptionQuery.data && (
          <p className="text-sm text-slate-500">
            Renews at {new Date(subscriptionQuery.data.renewsAt).toLocaleDateString()}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-teal-700">{message}</p>}

        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-white">
          Save subscription
        </button>
      </form>
    </div>
  );
}
