export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', padding: '2rem 5%', marginTop: 'auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1c1b', marginBottom: '0.4rem' }}>Grow For Me</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>© {new Date().getFullYear()} Grow For Me. All rights reserved.</div>
        </div>
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
          <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
          <span style={{ cursor: 'pointer' }}>Sustainability Report</span>
          <span style={{ cursor: 'pointer', color: '#166534', textDecoration: 'underline' }}>Farmer Support</span>
          <span style={{ cursor: 'pointer' }}>Contact Us</span>
        </div>
      </div>
    </footer>
  );
}
