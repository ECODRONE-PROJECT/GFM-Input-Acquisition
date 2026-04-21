import { Link } from 'react-router-dom';
import { ClipboardEdit, ShoppingCart, Truck } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { Logo } from '@/components/ui/Logo';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#1A1A1A',
      backgroundImage: 'url(/farmers_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      {/* Global dark overlay mask */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12, 45, 28, 0.65)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Navbar />

        {/* HERO SECTION */}
        <section id="hero" className="hero-section">

          {/* Farmer mascot — responsive class handles positioning */}
          <div className="hero-farmer">
            <img
              src="/farmer.png"
              alt="Happy Farmer"
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom right' }}
            />
          </div>

          <div className="hero-glass">
            <h1 className="hero-title" style={{ color: '#ffffff', marginBottom: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
              Aggregating Demand for Modern Agriculture
            </h1>
            <h2 style={{ color: '#e2e8f0', fontSize: '1.3rem', marginBottom: '1.5rem', fontWeight: 500, lineHeight: 1.4 }}>
              Empowering input providers and local farmers globally.
            </h2>
            <p style={{ fontSize: '1.05rem', marginBottom: '2.5rem', color: '#cbd5e1', lineHeight: 1.8 }}>
              GrowForMe is a digital agriculture platform that connects smallholder farmers with financing, quality inputs, and markets. An e-commerce interface that allows farmers to order seeds, fertilizers, and other robust inputs precisely.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="#invest" style={{ backgroundColor: '#c3d928', color: '#0C2D1C', padding: '1rem 2.25rem', borderRadius: '9999px', fontWeight: '800', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                Invest in Agriculture
              </a>
              <Link to="/register" style={{ backgroundColor: 'transparent', color: '#ffffff', padding: '1rem 2.25rem', borderRadius: '9999px', fontWeight: '700', border: '1px solid rgba(255, 255, 255, 0.3)', transition: 'background-color 0.2s' }}>
                Order Commodities
              </Link>
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section id="about-us" className="section-pad" style={{ backgroundColor: '#F9F9F7', color: '#1A1A1A' }}>
          <div className="section-inner-sm">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.02em', color: '#0C2D1C' }}>About Us</h2>
            <p style={{ fontSize: '1.25rem', lineHeight: 1.9, color: '#334155' }}>
              GrowForMe is a digital agriculture platform that connects smallholder farmers with financing, quality inputs, and markets. Founded with the mission to eliminate poverty across the agricultural belt, we empower rural farmers by integrating their supply chains with automated tracking and technological oversight, ensuring global standards are met smoothly and efficiently.
            </p>
          </div>
        </section>

        {/* WHAT WE DO SECTION */}
        <section id="what-we-do" className="section-pad" style={{ backgroundColor: '#021208', color: '#FFFFFF' }}>
          <div className="section-inner">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '3rem', color: '#ffffff', letterSpacing: '-0.02em' }}>What We Do</h2>
            <div className="grid-2">
              <div>
                <p style={{ fontSize: '1.15rem', lineHeight: 2, color: '#cbd5e1', marginBottom: '1.5rem' }}>
                  We provide an e-commerce interface that allows farmers to order seeds, fertilizers, and other inputs, aggregating demand for bulk purchasing. Our operations ensure that logistics, quality control, and scale are handled professionally.
                </p>
                <p style={{ fontSize: '1.15rem', lineHeight: 2, color: '#cbd5e1' }}>
                  By clustering inputs centrally, farmers unlock economies of scale otherwise unavailable individually, guaranteeing access to high-grade industrial seeds precisely when planting cycles demand it most.
                </p>
              </div>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)'
              }}>
                <div style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: 'rgba(195, 217, 40, 0.12)', color: '#c3d928', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '0.05em' }}>
                  SUPPORTING GROWTH
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#ffffff' }}>
                  Core Value Propositions
                </h3>
                <ul style={{ listStyleType: 'none', margin: 0, paddingLeft: 0, color: '#94a3b8', lineHeight: 2.2, fontSize: '1.05rem', fontWeight: 500 }}>
                  {['Direct linkages to verified seed and fertilizer producers.', 'Consolidated logistics for lower last-mile delivery costs.', 'Transparent commodity matching and bulk scaling.', 'Seamless, highly responsive purchasing dashboards.'].map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <span style={{ color: '#c3d928', fontWeight: 800 }}>•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="section-pad" style={{ backgroundColor: '#f1f3ee' }}>
          <div className="section-inner">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '4rem', textAlign: 'center', color: '#0C2D1C', letterSpacing: '-0.02em' }}>How It Works</h2>
            <div className="grid-3">
              {[
                { icon: <ClipboardEdit size={48} strokeWidth={1.5} />, title: '1. Register', text: 'Farmers register securely via our e-commerce portal and browse our verified catalog of raw materials across seeds and fertilizers.' },
                { icon: <ShoppingCart size={48} strokeWidth={1.5} />, title: '2. Aggregate Demand', text: 'An e-commerce interface allows farmers to order seeds, fertilizers, and other inputs, aggregating demand for bulk purchases.' },
                { icon: <Truck size={48} strokeWidth={1.5} />, title: '3. Delivery & Growth', text: 'Inputs are deployed via bulk distribution partners, scaling crop capacities accurately for local seasonal plantings.' }
              ].map((step, idx) => (
                <div key={idx} style={{
                  padding: '3rem 2rem', backgroundColor: '#ffffff',
                  borderRadius: '24px', border: '1px solid #e2e8f0',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ color: '#0C2D1C', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    {step.icon}
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem', color: '#0C2D1C' }}>{step.title}</h3>
                  <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7 }}>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INVEST SECTION */}
        <section id="invest" className="section-pad-lg" style={{ backgroundColor: '#052011', color: '#FFFFFF', textAlign: 'center' }}>
          <div className="section-inner-cta">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.02em', color: '#ffffff' }}>Build the Future of Agriculture</h2>
            <p style={{ fontSize: '1.15rem', lineHeight: 1.9, marginBottom: '3.5rem', color: '#94a3b8' }}>
              Join us in revolutionizing the agricultural supply chain. GrowForMe provides safe, predictable avenues to fund verified farmers across the region. Connect capital where it matters most, driving economic prosperity directly to the source.
            </p>
            <Link to="/register" style={{ display: 'inline-block', backgroundColor: '#c3d928', color: '#0C2D1C', padding: '1.25rem 3.5rem', borderRadius: '9999px', fontWeight: 800, fontSize: '1.05rem', transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(195, 217, 40, 0.2)' }}>
              Become an Investor
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
