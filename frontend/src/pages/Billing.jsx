import { useEffect } from 'react';
import { Check, Zap } from 'lucide-react';
import useAppStore from '../stores/appStore';
import useAuthStore from '../stores/authStore';

const plans = [
  { id: 'free', name: 'Free', price: '$0', period: 'forever', messages: '50 / day', campaigns: false, webhooks: false, automation: false },
  { id: 'starter', name: 'Starter', price: '$29', period: '/month', messages: '2,000 / month', campaigns: true, webhooks: false, automation: false },
  { id: 'pro', name: 'Pro', price: '$79', period: '/month', messages: '10,000 / month', campaigns: true, webhooks: true, automation: true },
  { id: 'enterprise', name: 'Enterprise', price: '$199', period: '/month', messages: '50,000 / month', campaigns: true, webhooks: true, automation: true },
];

export default function Billing() {
  const { usage, fetchUsage } = useAppStore();
  const { user } = useAuthStore();
  const currentPlan = user?.plan || 'free';

  useEffect(() => { fetchUsage(); }, []);

  const usedDaily = usage?.usage?.daily || 0;
  const usedMonthly = usage?.usage?.monthly || 0;
  const dailyLimit = usage?.usage?.dailyLimit;
  const monthlyLimit = usage?.usage?.monthlyLimit;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Billing</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your plan and usage</p>
      </div>

      {/* Current usage */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="font-medium text-sm mb-4">Current Usage</p>
        <div className="space-y-4">
          {dailyLimit && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Daily messages</span>
                <span className="text-gray-200">{usedDaily} / {dailyLimit}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (usedDaily / dailyLimit) * 100)}%` }} />
              </div>
            </div>
          )}
          {monthlyLimit && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Monthly messages</span>
                <span className="text-gray-200">{usedMonthly} / {monthlyLimit}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (usedMonthly / monthlyLimit) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`rounded-xl p-5 border transition-all ${
              currentPlan === plan.id
                ? 'bg-green-500/5 border-green-500/30'
                : 'bg-gray-900 border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">{plan.name}</p>
              {currentPlan === plan.id && (
                <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Current</span>
              )}
            </div>
            <div className="mb-3">
              <span className="text-xl font-bold">{plan.price}</span>
              <span className="text-xs text-gray-500">{plan.period}</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">{plan.messages}</p>
            <div className="space-y-2">
              {[
                ['Campaigns', plan.campaigns],
                ['Webhooks', plan.webhooks],
                ['Automation', plan.automation],
              ].map(([label, enabled]) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${enabled ? 'bg-green-500/10' : 'bg-gray-800'}`}>
                    {enabled && <Check size={10} className="text-green-400" />}
                  </div>
                  <span className={enabled ? 'text-gray-300' : 'text-gray-600'}>{label}</span>
                </div>
              ))}
            </div>
            {currentPlan !== plan.id && (
              <button className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                Upgrade to {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
