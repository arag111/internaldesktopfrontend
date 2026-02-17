'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useSearchParams } from 'next/navigation';
import { baseUrl } from '@/app/utils/config';
import { CreditCard, Check, Users, HardDrive, Zap, Crown, Building2 } from 'lucide-react';

interface PlanConfig {
  name: string;
  price: number | null;
  userLimit: number;
  storageLimit: number;
}

interface BillingInfo {
  currentPlan: string;
  usage: {
    users: number;
    userLimit: number;
    storageUsedMB: number;
    storageLimitGB: number;
    totalScreenshots: number;
  };
  subscriptionValidUntil: string;
  plans: Record<string, PlanConfig>;
}

export default function BillingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companySlug = params.company as string;

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check for Stripe redirect status
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setToastMessage({ message: 'Payment successful! Your plan has been upgraded.', type: 'success' });
      setTimeout(() => setToastMessage(null), 5000);
    } else if (status === 'cancelled') {
      setToastMessage({ message: 'Payment cancelled. Your plan was not changed.', type: 'error' });
      setTimeout(() => setToastMessage(null), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchBilling = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await axios.get(`${baseUrl}/api/billing/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBilling(res.data);
      } catch (err) {
        setToastMessage({ message: 'Failed to load billing info', type: 'error' });
        setTimeout(() => setToastMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  const handleUpgrade = async (plan: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setUpgrading(plan);
    try {
      const res = await axios.post(`${baseUrl}/api/billing/create-checkout-session`, { plan }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Redirect to Stripe Checkout
      window.location.href = res.data.url;
    } catch (err: any) {
      setToastMessage({ message: err.response?.data?.msg || 'Failed to start checkout', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      setUpgrading(null);
    }
  };

  const planIcons: Record<string, React.ReactNode> = {
    free: <Zap className="w-6 h-6 text-slate-600" />,
    basic: <CreditCard className="w-6 h-6 text-blue-600" />,
    premium: <Crown className="w-6 h-6 text-purple-600" />,
    enterprise: <Building2 className="w-6 h-6 text-amber-600" />,
  };

  const planColors: Record<string, string> = {
    free: 'border-slate-200',
    basic: 'border-blue-200',
    premium: 'border-purple-200',
    enterprise: 'border-amber-200',
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-600">Loading billing info...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="mt-16 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50" style={{ marginLeft: '16rem' }}>
        {/* Header */}
        <div className="mb-8 bg-white rounded-lg p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-normal text-slate-900 mb-0.5">Billing & Plans</h1>
              <p className="text-sm text-slate-500">Manage your subscription and view usage</p>
            </div>
          </div>
        </div>

        {billing && (
          <>
            {/* Current Usage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg p-5 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-slate-500 uppercase">Users</span>
                </div>
                <p className="text-2xl font-semibold text-slate-900">{billing.usage.users} <span className="text-sm font-normal text-slate-400">/ {billing.usage.userLimit}</span></p>
                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min((billing.usage.users / billing.usage.userLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-slate-500 uppercase">Storage</span>
                </div>
                <p className="text-2xl font-semibold text-slate-900">
                  {(billing.usage.storageUsedMB / 1024).toFixed(1)}GB
                  <span className="text-sm font-normal text-slate-400"> / {billing.usage.storageLimitGB}GB</span>
                </p>
                <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${billing.usage.storageLimitGB > 0 ? Math.min((billing.usage.storageUsedMB / (billing.usage.storageLimitGB * 1024)) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-slate-500 uppercase">Current Plan</span>
                </div>
                <p className="text-2xl font-semibold text-slate-900 capitalize">{billing.currentPlan}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Valid until {new Date(billing.subscriptionValidUntil).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(billing.plans).map(([planKey, plan]) => {
                const isCurrent = billing.currentPlan === planKey;
                const isDowngrade = Object.keys(billing.plans).indexOf(planKey) < Object.keys(billing.plans).indexOf(billing.currentPlan);

                return (
                  <div
                    key={planKey}
                    className={`bg-white rounded-lg p-6 border-2 ${isCurrent ? 'border-blue-500 ring-1 ring-blue-200' : planColors[planKey] || 'border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {planIcons[planKey]}
                      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                    </div>

                    <div className="mb-4">
                      {plan.price !== null ? (
                        <p className="text-3xl font-bold text-slate-900">
                          ${plan.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                        </p>
                      ) : (
                        <p className="text-lg font-semibold text-slate-600">Custom Pricing</p>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        Up to {plan.userLimit} users
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {plan.storageLimit}GB storage
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        Screenshots & monitoring
                      </li>
                      {planKey === 'premium' || planKey === 'enterprise' ? (
                        <li className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          API access
                        </li>
                      ) : null}
                    </ul>

                    {isCurrent ? (
                      <div className="w-full py-2.5 px-4 bg-blue-50 text-blue-700 rounded-lg text-center text-sm font-medium border border-blue-200">
                        Current Plan
                      </div>
                    ) : planKey === 'free' || isDowngrade ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
                      >
                        {planKey === 'free' ? 'Free' : 'Downgrade N/A'}
                      </button>
                    ) : planKey === 'enterprise' ? (
                      <button
                        className="w-full py-2.5 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                        onClick={() => {
                          setToastMessage({ message: 'Please contact sales for Enterprise pricing.', type: 'success' });
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                      >
                        Contact Sales
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(planKey)}
                        disabled={upgrading === planKey}
                        className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {upgrading === planKey ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 toast-slide-in">
          <div className={`rounded-lg border shadow-lg px-4 py-3 min-w-[300px] flex items-center justify-between gap-4 ${
            toastMessage.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              toastMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}>{toastMessage.message}</p>
            <button onClick={() => setToastMessage(null)} className={`hover:opacity-70 transition-colors flex-shrink-0 ${
              toastMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
