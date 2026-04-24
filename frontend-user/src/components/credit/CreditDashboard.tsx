import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingCart, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  CreditCard,
  History,
  Info
} from 'lucide-react';

interface CreditDashboardProps {
  creditAccount: {
    status: string;
    available_credit: number;
    assigned_credit_limit: number;
    consumed_credit: number;
    last_score: number;
    creditworthiness: string | null;
  };
  displayName: string;
}

export function CreditDashboard({ creditAccount, displayName }: CreditDashboardProps) {
  const navigate = useNavigate();
  const {
    available_credit,
    assigned_credit_limit,
    consumed_credit,
    creditworthiness,
    last_score
  } = creditAccount;

  const usagePercent = assigned_credit_limit > 0 
    ? (consumed_credit / assigned_credit_limit) * 100 
    : 0;

  const formatGHS = (val: number) => `GHS ${val.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;

  return (
    <div className="credit-dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div>
          <span className="welcome-tag">AGRONOMY PARTNER</span>
          <h2 className="dashboard-title">Welcome back, {displayName}</h2>
        </div>
        <div className="creditworthiness-badge">
          <ShieldCheck size={18} />
          <span>{creditworthiness || 'Excellent'} Standing</span>
        </div>
      </div>

      {/* Main Credit Card Visualization */}
      <div className="premium-credit-card">
        <div className="card-glass-layer" />
        <div className="card-content">
          <div className="card-top">
            <div className="brand">
              <div className="gfm-logo-mark" />
              <span>Grow For Me <span className="capital">Capital</span></span>
            </div>
            <div className="chip" />
          </div>
          
          <div className="card-middle">
            <span className="label">AVAILABLE CAPITAL</span>
            <div className="amount">{formatGHS(available_credit)}</div>
          </div>

          <div className="card-bottom">
            <div className="card-info">
              <span className="label">TOTAL LIMIT</span>
              <span className="value">{formatGHS(assigned_credit_limit)}</span>
            </div>
            <div className="card-info text-right">
              <span className="label">CREDIT SCORE</span>
              <span className="value">{last_score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon utilization">
            <TrendingUp size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-label">Utilization</span>
            <span className="stat-value">{usagePercent.toFixed(1)}%</span>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.min(usagePercent, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon used">
            <CreditCard size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-label">Used Capital</span>
            <span className="stat-value">{formatGHS(consumed_credit)}</span>
            <span className="stat-sub">Outstanding balance</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="dashboard-actions">
        <button 
          className="action-btn primary"
          onClick={() => navigate('/shop')}
        >
          <ShoppingCart size={20} />
          <span>Shop with Credit</span>
          <ChevronRight size={18} className="ml-auto" />
        </button>

        <button 
          className="action-btn secondary"
          onClick={() => navigate('/orders')}
        >
          <History size={20} />
          <span>Transaction History</span>
          <ChevronRight size={18} className="ml-auto" />
        </button>
      </div>

      {/* Insights Section */}
      <div className="insights-panel">
        <div className="insights-header">
          <Info size={18} />
          <span>Underwriting Insights</span>
        </div>
        <p className="insights-text">
          Your capital limit is optimized for the current planting season. Increase your score by settling invoices on time to unlock higher tiers of financing.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .credit-dashboard-container {
          animation: fadeIn 0.8s ease-out;
        }

        .welcome-tag {
          font-size: 0.65rem;
          font-weight: 700;
          color: #084c17;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: #e2f5e8;
          padding: 0.3rem 0.7rem;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 0.75rem;
        }

        .dashboard-title {
          font-family: 'Newsreader', serif;
          font-size: 1.85rem;
          font-weight: 700;
          color: #1a1c1b;
          margin: 0 0 2rem 0;
          letter-spacing: -0.01em;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .creditworthiness-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #084c17;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .premium-credit-card {
          width: 100%;
          height: 280px;
          border-radius: 32px;
          background: linear-gradient(135deg, #084c17 0%, #032b0d 100%);
          position: relative;
          overflow: hidden;
          padding: 2.5rem;
          color: white;
          box-shadow: 0 25px 50px -12px rgba(8, 76, 23, 0.4);
          margin-bottom: 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card-glass-layer {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.05) 100%);
          pointer-events: none;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: -0.01em;
        }

        .brand .capital {
          font-weight: 300;
          opacity: 0.8;
        }

        .gfm-logo-mark {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: 8px;
          position: relative;
        }

        .chip {
          width: 45px;
          height: 35px;
          background: linear-gradient(135deg, #f3d49b 0%, #d4a03d 100%);
          border-radius: 6px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        }

        .card-middle .label {
          font-size: 0.75rem;
          font-weight: 700;
          opacity: 0.6;
          letter-spacing: 0.1em;
          display: block;
          margin-bottom: 0.5rem;
        }

        .card-middle .amount {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          font-family: 'Inter', sans-serif;
        }

        .card-bottom {
          display: flex;
          justify-content: space-between;
        }

        .card-info .label {
          font-size: 0.65rem;
          font-weight: 700;
          opacity: 0.5;
          letter-spacing: 0.1em;
          display: block;
          margin-bottom: 0.25rem;
        }

        .card-info .value {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .stat-card {
          background: white;
          border: 1px solid #f1f5f9;
          padding: 1.5rem;
          border-radius: 24px;
          display: flex;
          gap: 1.25rem;
          align-items: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.02);
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.utilization { background: #f0fdf4; color: #166534; }
        .stat-icon.used { background: #fff1f2; color: #991b1b; }

        .stat-data { flex: 1; display: flex; flex-direction: column; }
        .stat-label { font-size: 0.7rem; font-weight: 600; color: #64748b; margin-bottom: 0.15rem; }
        .stat-value { font-size: 1.1rem; font-weight: 700; color: #1a1c1b; margin-bottom: 0.4rem; }
        .stat-sub { font-size: 0.7rem; color: #94a3b8; }

        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #084c17;
          border-radius: 3px;
        }

        .dashboard-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }

        .action-btn {
          padding: 1rem 1.25rem;
          border-radius: 14px;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: #084c17;
          color: white;
          box-shadow: 0 10px 20px rgba(8, 76, 23, 0.1);
        }

        .action-btn.secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .action-btn:hover {
          filter: brightness(1.1);
          transform: scale(1.02);
        }

        .insights-panel {
          background: #fcfcf9;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 1.5rem;
        }

        .insights-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 800;
          color: #084c17;
          font-size: 0.85rem;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }

        .insights-text {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .ml-auto { margin-left: auto; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
