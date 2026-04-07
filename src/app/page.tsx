import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', color: '#0f172a' }}>

      {/* Navigation Bar */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1.5rem 2rem', backgroundColor: 'rgba(16, 60, 31, 0.95)',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <Logo />
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'white', letterSpacing: '0.05em' }}>
          <Link href="#investments" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>INVESTMENTS</Link>
          <Link href="#what-we-do" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>WHAT WE DO</Link>
          <Link href="#about-us" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>ABOUT US</Link>
          <Link href="#how-it-works" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>HOW IT WORKS</Link>
          <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
            <Link href="/register" style={{
              padding: '0.6rem 1.5rem', backgroundColor: 'white', color: 'var(--primary)',
              borderRadius: '9999px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem'
            }}>Register</Link>
            <Link href="/login" style={{
              padding: '0.6rem 1.5rem', border: '2px solid white', color: 'white',
              borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem'
            }}>Sign In</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="hero" style={{
        minHeight: '85vh', backgroundImage: 'url(/farmers_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center',
        padding: '4rem 5%', display: 'flex', alignItems: 'center'
      }}>
        <div style={{ 
          maxWidth: '850px', backgroundColor: 'rgba(16, 60, 31, 0.75)',
          backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)', padding: '4rem', borderRadius: '1.5rem',
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)'
        }}>
          <h1 style={{ color: '#ffffff', fontSize: '4rem', marginBottom: '1rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Aggregating Demand for Farmers
          </h1>
          <h2 style={{ color: '#d1d5db', fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 400 }}>
            By connecting input providers and farmers.
          </h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', color: '#f3f4f6', lineHeight: 1.7 }}>
            GrowForMe is a digital agriculture platform that connects smallholder farmers with financing, quality inputs, and markets. An e-commerce interface that allows farmers to order seeds, fertilizers, and other inputs, aggregating demand for bulk purchasing.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="#investments" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: '800', transition: 'background-color 0.2s' }}>
              Invest in Agriculture
            </Link>
            <Link href="/register" style={{ backgroundColor: '#f5a623', color: '#ffffff', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: '700', border: '1px solid rgba(255, 255, 255, 0.1)', transition: 'opacity 0.2s' }}>
              Order Commodities
            </Link>
          </div>
        </div>
      </section>

      {/* WHAT WE DO SECTION */}
      <section id="what-we-do" style={{ padding: '8rem 5%', backgroundColor: 'white' }}>
        <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '3rem', color: '#166534', letterSpacing: '-0.02em' }}>What We Do</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
          <div>
            <p style={{ fontSize: '1.25rem', lineHeight: 1.8, color: '#475569', marginBottom: '1.5rem' }}>
              We provide an e-commerce interface that allows farmers to order seeds, fertilizers, and other inputs, aggregating demand for bulk purchasing. Our operations ensure that logistics, quality control, and scale are handled professionally. 
            </p>
            <p style={{ fontSize: '1.25rem', lineHeight: 1.8, color: '#475569' }}>
              By clustering inputs centrally, farmers unlock economies of scale otherwise unavailable individually, guaranteeing access to high-grade industrial seeds precisely when planting cycles demand it most.
            </p>
          </div>
          <div style={{ backgroundColor: '#f8fafc', padding: '3rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#0f172a' }}>Core Value Propositions</h3>
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', color: '#334155', lineHeight: 2.2, fontSize: '1.1rem' }}>
              <li>Direct linkages to verified seed and fertilizer producers.</li>
              <li>Consolidated logistics for lower last-mile delivery costs.</li>
              <li>Transparent commodity matching and bulk scaling.</li>
              <li>Seamless, highly responsive purchasing dashboards.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about-us" style={{ padding: '8rem 5%', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '2rem', color: '#166534', letterSpacing: '-0.02em' }}>About Us</h2>
          <p style={{ fontSize: '1.35rem', lineHeight: 1.8, color: '#334155' }}>
            GrowForMe is a digital agriculture platform that connects smallholder farmers with financing, quality inputs, and markets. Founded with the mission to eliminate poverty across the agricultural belt, we empower rural farmers by integrating their supply chains heavily with automated tracking and technological oversight, ensuring global standards are met smoothly and efficiently.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" style={{ padding: '8rem 5%', backgroundColor: 'white' }}>
        <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '4rem', textAlign: 'center', color: '#166534', letterSpacing: '-0.02em' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', textAlign: 'center' }}>
          <div style={{ padding: '3rem 2rem', backgroundColor: '#f0fdf4', borderRadius: '1rem', border: '1px solid #dcfce7' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📝</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#166534' }}>1. Register</h3>
            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: 1.6 }}>Farmers register securely via our e-commerce portal and natively browse our verified catalog of raw materials across seeds and fertilizers.</p>
          </div>
          <div style={{ padding: '3rem 2rem', backgroundColor: '#fefce8', borderRadius: '1rem', border: '1px solid #fef08a' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🛒</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#854d0e' }}>2. Aggregate Demand</h3>
            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: 1.6 }}>An e-commerce interface allows farmers to order seeds, fertilizers, and other inputs, organically aggregating demand for bulk purchases.</p>
          </div>
          <div style={{ padding: '3rem 2rem', backgroundColor: '#eff6ff', borderRadius: '1rem', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🚜</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#1e40af' }}>3. Delivery & Growth</h3>
            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: 1.6 }}>Inputs are safely deployed via bulk distribution partners, scaling crop capacities accurately for local seasonal plantings.</p>
          </div>
        </div>
      </section>

      {/* INVESTMENTS SECTION */}
      <section id="investments" style={{ padding: '8rem 5%', backgroundColor: '#103c1f', color: 'white', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.02em' }}>Invest in Agriculture</h2>
          <p style={{ fontSize: '1.25rem', lineHeight: 1.8, marginBottom: '3rem', opacity: 0.9 }}>
            Join us in revolutionizing the agricultural supply chain. GrowForMe provides safe, predictable avenues to fund verified farmers across the region while securing significant social impact constraints. Connect capital where it matters most, driving economic prosperity directly to the source.
          </p>
          <Link href="/register" style={{ display: 'inline-block', backgroundColor: '#f5a623', color: 'white', padding: '1.25rem 3.5rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
            Become an Investor
          </Link>
        </div>
      </section>

      <footer style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#022c22', color: '#94a3b8', fontSize: '0.95rem' }}>
        © {new Date().getFullYear()} Grow For Me - Aggregating Demand for Bulk Purchasing. All rights reserved.
      </footer>
    </div>
  );
}
