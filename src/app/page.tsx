import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ClipboardEdit, ShoppingCart, Truck } from 'lucide-react';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'white',
      backgroundImage: 'url(/farmers_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16, 60, 31, 0.8)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Navigation Bar */}
        <nav style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '1.5rem 2rem', backgroundColor: 'rgba(16, 60, 31, 0.4)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Logo />
          <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'white', letterSpacing: '0.05em' }}>
            <Link href="#investments" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>INVESTMENTS</Link>
            <Link href="#what-we-do" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>WHAT WE DO</Link>
            <Link href="#about-us" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>ABOUT US</Link>
            <Link href="#how-it-works" style={{ color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}>HOW IT WORKS</Link>
            <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
              <Link href="/register" style={{
                padding: '0.6rem 1.5rem', backgroundColor: 'white', color: '#166534',
                borderRadius: '9999px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem'
              }}>Register</Link>
              <Link href="/login" style={{
                padding: '0.6rem 1.5rem', border: '2px solid white', color: 'white',
                borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem'
              }}>Sign In</Link>
            </div>
          </div>
        </nav>

        {/* HERO SECTION (Glassmorphism over Image) */}
        <section id="hero" style={{
          minHeight: '85vh', padding: '4rem 5%', display: 'flex', alignItems: 'center'
        }}>
          <div style={{ 
            maxWidth: '850px', backgroundColor: 'rgba(16, 60, 31, 0.4)',
            backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)', padding: '4rem', borderRadius: '1.5rem',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.3)'
          }}>
            <h1 style={{ color: '#ffffff', fontSize: '4rem', marginBottom: '1rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              Aggregating Demand for Farmers
            </h1>
            <h2 style={{ color: '#d1d5db', fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 400, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              By connecting input providers and farmers.
            </h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', color: '#e2e8f0', lineHeight: 1.7 }}>
              GrowForMe is a digital agriculture platform that connects smallholder farmers with financing, quality inputs, and markets. An e-commerce interface that allows farmers to order seeds, fertilizers, and other inputs, aggregating demand for bulk purchasing.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="#investments" style={{ backgroundColor: 'white', color: '#166534', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: '800', transition: 'background-color 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                Invest in Agriculture
              </Link>
              <Link href="/register" style={{ backgroundColor: '#f5a623', color: '#ffffff', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: '700', border: '1px solid rgba(255, 255, 255, 0.1)', transition: 'opacity 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                Order Commodities
              </Link>
            </div>
          </div>
        </section>

        {/* WHAT WE DO SECTION (Solid White background blocking the image) */}
        <section id="what-we-do" style={{ padding: '8rem 5%', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
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
            <div style={{ 
              backgroundColor: '#f8fafc', 
              padding: '3rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' 
            }}>
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

        {/* ABOUT US SECTION (Solid Slate background blocking the image) */}
        <section id="about-us" style={{ padding: '8rem 5%', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '2rem', color: '#166534', letterSpacing: '-0.02em' }}>About Us</h2>
            <p style={{ fontSize: '1.35rem', lineHeight: 1.8, color: '#334155' }}>
              GrowForMe is a digital agriculture platform that connects smallholder farmers with financing, quality inputs, and markets. Founded with the mission to eliminate poverty across the agricultural belt, we empower rural farmers by integrating their supply chains heavily with automated tracking and technological oversight, ensuring global standards are met smoothly and efficiently.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS SECTION (Glassmorphism over Image) */}
        <section id="how-it-works" style={{ padding: '8rem 5%', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '4rem', textAlign: 'center', color: '#ffffff', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', textAlign: 'center' }}>
            
            {[
              { icon: <ClipboardEdit size={54} strokeWidth={1.5} />, title: '1. Register', text: 'Farmers register securely via our e-commerce portal and natively browse our verified catalog of raw materials across seeds and fertilizers.' },
              { icon: <ShoppingCart size={54} strokeWidth={1.5} />, title: '2. Aggregate Demand', text: 'An e-commerce interface allows farmers to order seeds, fertilizers, and other inputs, organically aggregating demand for bulk purchases.' },
              { icon: <Truck size={54} strokeWidth={1.5} />, title: '3. Delivery & Growth', text: 'Inputs are safely deployed via bulk distribution partners, scaling crop capacities accurately for local seasonal plantings.' }
            ].map((step, idx) => (
              <div key={idx} style={{ 
                padding: '3.5rem 2.5rem', 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 20px 40px -5px rgba(0,0,0,0.2)'
              }}>
                <div style={{ color: 'white', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: '#ffffff' }}>{step.title}</h3>
                <p style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: 1.6 }}>{step.text}</p>
              </div>
            ))}
            
          </div>
        </section>

        {/* INVESTMENTS SECTION (Solid Dark Green background blocking the image) */}
        <section id="investments" style={{ padding: '8rem 5%', backgroundColor: '#103c1f', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Invest in Agriculture</h2>
            <p style={{ fontSize: '1.25rem', lineHeight: 1.8, marginBottom: '3rem', color: '#e2e8f0' }}>
              Join us in revolutionizing the agricultural supply chain. GrowForMe provides safe, predictable avenues to fund verified farmers across the region while securing significant social impact constraints. Connect capital where it matters most, driving economic prosperity directly to the source.
            </p>
            <Link href="/register" style={{ display: 'inline-block', backgroundColor: '#f5a623', color: 'white', padding: '1.25rem 3.5rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
              Become an Investor
            </Link>
          </div>
        </section>

        <footer style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#022c22', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.95rem' }}>
          © {new Date().getFullYear()} Grow For Me - Aggregating Demand for Bulk Purchasing. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
