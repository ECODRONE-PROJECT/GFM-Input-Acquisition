import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  ArrowUpRight, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { renewCredit } from '@/lib/clientData';

interface RenewalModalProps {
  userId: string;
  currentLimit: number;
  onClose: (renewed: boolean) => void;
}

export function RenewalModal({ userId, currentLimit, onClose }: RenewalModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const boostAmount = Math.max(currentLimit * 0.25, 500);
  const newLimit = currentLimit + boostAmount;

  const handleRenew = async (accept: boolean) => {
    setLoading(true);
    setError('');
    try {
      await renewCredit(userId, accept);
      if (accept) {
        setSuccess(true);
        setTimeout(() => onClose(true), 2000);
      } else {
        onClose(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Renewal failed.');
      setLoading(false);
    }
  };

  const formatGHS = (val: number) => `GHS ${val.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {!success ? (
          <>
            <div className="modal-header">
              <div className="sparkle-icon">
                <Sparkles size={24} />
              </div>
              <button className="close-btn" onClick={() => onClose(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <h2 className="modal-title">Limit Renewal Available</h2>
              <p className="modal-desc">
                Congratulations! Based on your recent payment history and agronomy metrics, you are eligible for an immediate capital limit increase.
              </p>

              <div className="renewal-comparison">
                <div className="compare-item">
                  <span className="compare-label">CURRENT</span>
                  <span className="compare-value old">{formatGHS(currentLimit)}</span>
                </div>
                <div className="compare-arrow">
                  <TrendingUp size={24} />
                </div>
                <div className="compare-item">
                  <span className="compare-label">NEW LIMIT</span>
                  <span className="compare-value new">{formatGHS(newLimit)}</span>
                </div>
              </div>

              <div className="offer-highlights">
                <div className="highlight">
                  <CheckCircle2 size={16} />
                  <span>Instant activation</span>
                </div>
                <div className="highlight">
                  <CheckCircle2 size={16} />
                  <span>No additional documents required</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="renew-confirm-btn" 
                disabled={loading}
                onClick={() => handleRenew(true)}
              >
                {loading ? 'Processing...' : 'Accept Increase'}
                {!loading && <ArrowUpRight size={18} />}
              </button>
              <button 
                className="renew-decline-btn"
                disabled={loading}
                onClick={() => handleRenew(false)}
              >
                Not now, keep current limit
              </button>
            </div>

            {error && (
              <div className="modal-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </>
        ) : (
          <div className="success-view">
            <div className="success-icon">
              <CheckCircle2 size={64} />
            </div>
            <h2 className="modal-title">Limit Updated</h2>
            <p className="modal-desc">
              Your new capital limit of {formatGHS(newLimit)} is now active.
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26, 28, 27, 0.6);
          backdrop-filter: blur(10px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: fadeIn 0.3s ease-out;
        }

        .modal-content {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 32px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.3);
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
          animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .sparkle-icon {
          width: 48px;
          height: 48px;
          background: #e2f5e8;
          color: #084c17;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn {
          border: none;
          background: #f1f5f9;
          color: #64748b;
          padding: 0.5rem;
          border-radius: 50%;
          cursor: pointer;
        }

        .modal-title {
          font-family: 'Newsreader', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1c1b;
          margin: 0 0 1rem 0;
        }

        .modal-desc {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .renewal-comparison {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .compare-item { display: flex; flex-direction: column; }
        .compare-label { font-size: 0.6rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
        .compare-value { font-size: 1.15rem; font-weight: 700; }
        .compare-value.old { color: #94a3b8; text-decoration: line-through; opacity: 0.6; }
        .compare-value.new { color: #166534; font-size: 1.4rem; }
        .compare-arrow { color: #166534; opacity: 0.2; }

        .offer-highlights {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2.5rem;
        }

        .highlight {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .highlight svg { color: #084c17; }

        .modal-footer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .renew-confirm-btn {
          background: #166534;
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          transition: all 0.2s;
        }

        .renew-confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .renew-decline-btn {
          background: transparent;
          color: #64748b;
          border: none;
          padding: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .modal-error {
          margin-top: 1.5rem;
          background: #fef2f2;
          color: #991b1b;
          padding: 0.75rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .success-view {
          text-align: center;
          padding: 2rem 0;
        }

        .success-icon {
          color: #084c17;
          margin-bottom: 2rem;
          animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}} />
    </div>
  );
}
