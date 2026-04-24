import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Calendar, 
  Clock, 
  ChevronRight, 
  FileText,
  LifeBuoy,
  RefreshCcw
} from 'lucide-react';

interface RejectionStateProps {
  application: {
    id: string | null;
    status: string | null;
    review_note: string | null;
    reviewed_at: string | null;
    reapply_available_at?: string | null;
  };
}

export function RejectionState({ application }: RejectionStateProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!application.reapply_available_at) return;

    const targetDate = new Date(application.reapply_available_at);
    
    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Available now');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [application.reapply_available_at]);

  const reviewedAtDate = application.reviewed_at 
    ? new Date(application.reviewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <div className="rejection-container">
      {/* Hero Icon */}
      <div className="rejection-icon">
        <AlertCircle size={48} strokeWidth={2.5} />
      </div>

      <h2 className="rejection-title">Application Status Update</h2>
      <p className="rejection-subtitle">
        Reviewed on {reviewedAtDate}
      </p>

      {/* Status Box */}
      <div className="status-box rejected">
        <div className="status-badge">REJECTED</div>
        <p className="status-note">
          {application.review_note || "After careful consideration of your recent submission and agronomy data, our underwriting team is unable to approve a credit line at this time."}
        </p>
      </div>

      {/* Info Grid */}
      <div className="info-grid">
        <div className="info-card">
          <div className="info-icon">
            <Clock size={20} />
          </div>
          <div className="info-content">
            <span className="info-label">REAPPLICATION WINDOW</span>
            <span className="info-value">{timeLeft || 'Loading...'}</span>
            <span className="info-sub">Cooling-off period active</span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <Calendar size={20} />
          </div>
          <div className="info-content">
            <span className="info-label">NEXT ELIGIBILITY</span>
            <span className="info-value">
              {application.reapply_available_at 
                ? new Date(application.reapply_available_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                : 'TBD'}
            </span>
            <span className="info-sub">Subject to data refresh</span>
          </div>
        </div>
      </div>

      {/* Helpful Resources */}
      <div className="resources-section">
        <h3 className="resources-title">Recommended Next Steps</h3>
        
        <div className="resource-list">
          <div className="resource-item">
            <div className="res-icon"><FileText size={18} /></div>
            <div className="res-text">
              <strong>Review Criteria</strong>
              <p>Understand the 20+ factors we use for scoring.</p>
            </div>
            <ChevronRight size={16} />
          </div>

          <div className="resource-item">
            <div className="res-icon"><RefreshCcw size={18} /></div>
            <div className="res-text">
              <strong>Update Data</strong>
              <p>Keep your Mobile Money and crop records active.</p>
            </div>
            <ChevronRight size={16} />
          </div>

          <div className="resource-item">
            <div className="res-icon"><LifeBuoy size={18} /></div>
            <div className="res-text">
              <strong>Support Chat</strong>
              <p>Speak with an agronomy advisor.</p>
            </div>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .rejection-container {
          animation: slideUp 0.6s ease-out;
          text-align: center;
        }

        .rejection-icon {
          width: 80px;
          height: 80px;
          background: #fef2f2;
          color: #ef4444;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem;
        }

        .rejection-title {
          font-family: 'Newsreader', serif;
          font-size: 2rem;
          font-weight: 700;
          color: #1a1c1b;
          margin: 0 0 0.5rem 0;
        }

        .rejection-subtitle {
          color: #94a3b8;
          font-weight: 600;
          font-size: 1rem;
          margin: 0 0 3rem 0;
        }

        .status-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 2.5rem;
          margin-bottom: 3rem;
          position: relative;
        }

        .status-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.3rem 0.9rem;
          border-radius: 6px;
          letter-spacing: 0.1em;
        }

        .status-note {
          margin: 0;
          color: #475569;
          font-size: 1.1rem;
          line-height: 1.6;
          font-style: italic;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 4rem;
        }

        .info-card {
          background: white;
          border: 1px solid #f1f5f9;
          padding: 1.5rem;
          border-radius: 20px;
          display: flex;
          gap: 1rem;
          align-items: center;
          text-align: left;
        }

        .info-icon {
          width: 44px;
          height: 44px;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-content { display: flex; flex-direction: column; }
        .info-label { font-size: 0.6rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 0.15rem; }
        .info-value { font-size: 1.05rem; font-weight: 700; color: #1a1c1b; }
        .info-sub { font-size: 0.7rem; color: #94a3b8; }

        .resources-section {
          text-align: left;
          background: #fcfcf9;
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid #e2e8f0;
        }

        .resources-title {
          font-size: 1rem;
          font-weight: 800;
          color: #1a1c1b;
          margin: 0 0 1.5rem 0;
        }

        .resource-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .resource-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .resource-item:hover {
          border-color: #e2e8f0;
          transform: translateX(4px);
        }

        .res-icon {
          color: #084c17;
          opacity: 0.6;
        }

        .res-text { flex: 1; }
        .res-text strong { display: block; font-size: 0.9rem; color: #1a1c1b; margin-bottom: 0.1rem; }
        .res-text p { margin: 0; font-size: 0.8rem; color: #64748b; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
