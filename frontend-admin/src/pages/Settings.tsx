export default function Settings() {
  return (
    <section className="w-full min-h-full space-y-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-outline-variant/20 pb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2 font-headline">System Configuration</h2>
          <p className="text-stone-500 max-w-lg font-body leading-relaxed">Manage the digital infrastructure of Grow For Me. Fine-tune webhooks, distribution logic, and audit the trail of administrative changes.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">save</span> Save All Changes
          </button>
        </div>
      </div>

      {/* Custom Horizontal Tabs */}
      <nav className="flex gap-8 border-none overflow-x-auto no-scrollbar">
        <button className="pb-4 border-b-2 border-primary text-primary font-bold whitespace-nowrap px-1">General</button>
        <button className="pb-4 border-b-2 border-transparent text-stone-400 hover:text-on-surface font-medium whitespace-nowrap px-1">Payments</button>
        <button className="pb-4 border-b-2 border-transparent text-stone-400 hover:text-on-surface font-medium whitespace-nowrap px-1">Distribution</button>
        <button className="pb-4 border-b-2 border-transparent text-stone-400 hover:text-on-surface font-medium whitespace-nowrap px-1">Audit Logs</button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Primary Configs */}
        <div className="lg:col-span-7 space-y-8">
          {/* Webhook Tokens Card */}
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">webhook</span> Webhook Integration
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Production API Token</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-surface-container-high px-4 py-3 rounded font-mono text-sm text-stone-600 truncate flex items-center">
                      gfm_live_7x92_k8l2_4491_p0q3_harvest_prod
                    </div>
                    <button className="bg-surface-container px-3 py-2 rounded hover:bg-surface-container-highest transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-stone-600">content_copy</span>
                    </button>
                    <button className="bg-surface-container px-3 py-2 rounded hover:bg-surface-container-highest transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-stone-600">refresh</span>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-stone-400 italic">Last regenerated 14 days ago by Aris.</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-9xl">hub</span>
            </div>
          </div>

          {/* Operational Flags */}
          <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/10">
            <h3 className="text-xl font-bold mb-8">Operational Flags</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Auto-Payouts</p>
                  <p className="text-xs text-stone-500">Release funds immediately</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Global Inventory</p>
                  <p className="text-xs text-stone-500">Share stock across regions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Smart Delivery</p>
                  <p className="text-xs text-stone-500">Route via nearest hub</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Default ETA (Days)</label>
                <input className="w-full bg-surface-container-highest border-none rounded py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" type="number" defaultValue="5" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Audit Trail */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-surface-container-high p-8 rounded-xl border border-outline-variant/10 h-[calc(100vh-6rem)] sticky top-4 overflow-y-auto flex flex-col custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Audit Trail</h3>
              <button className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">View All</button>
            </div>
            
            <div className="space-y-1 w-full flex-1">
              <div className="bg-surface p-5 rounded-lg mb-4 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">person</span>
                </div>
                <div>
                  <p className="text-sm text-on-surface leading-snug">
                    <span className="font-bold">Admin Aris</span> approved <span className="font-bold text-primary">Credit Limit</span> for User <span className="underline">#221</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                    <span>2 mins ago</span>
                    <span>•</span>
                    <span>IP: 192.168.1.45</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-surface p-5 rounded-lg mb-4 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">sync</span>
                </div>
                <div>
                  <p className="text-sm text-on-surface leading-snug">
                    <span className="font-bold">System</span> updated stock levels for <span className="font-bold">Sorghum Seeds (V2)</span> across West Region.
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                    <span>15 mins ago</span>
                    <span>•</span>
                    <span>Automated Task</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-surface p-5 rounded-lg mb-4 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">security</span>
                </div>
                <div>
                  <p className="text-sm text-on-surface leading-snug">
                    <span className="font-bold">Manager Sarah</span> rotated <span className="font-bold text-tertiary">Distribution API Keys</span> for main node.
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                    <span>1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-outline-variant/30">
              <div className="bg-error-container/30 p-6 rounded-lg border border-error/10">
                <h4 className="text-error font-bold text-sm uppercase tracking-widest mb-3">Dangerous Territory</h4>
                <p className="text-xs text-on-error-container/80 mb-6 leading-relaxed">Clearing logs is permanent. All historical accountability data will be purged. This action cannot be undone.</p>
                <button className="w-full py-4 bg-tertiary text-on-tertiary font-black text-xs uppercase tracking-[0.2em] rounded-lg shadow-xl shadow-tertiary/20 active:opacity-80 transition-all border-b-4 border-black/20">
                  Purge Audit History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
