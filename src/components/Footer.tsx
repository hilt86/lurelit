export default function Footer() {
  return (
    <footer className="mono" style={{
      padding: '48px 0 60px',
      borderTop: '1px solid var(--border)',
      textAlign: 'center',
      fontSize: 10,
      color: 'var(--text-faint)',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    }}>
      <span style={{ color: 'var(--pink)', opacity: 0.7 }}>Lurelit</span>
      <span style={{ margin: '0 10px', opacity: 0.3 }}>·</span>
      Built by <a href="https://www.linkedin.com/in/jamesspiteri/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid var(--border-strong)' }}>James Spiteri</a>
      <span style={{ margin: '0 10px', opacity: 0.3 }}>·</span>
      Powered by <a href="https://www.elastic.co/docs/explore-analyze/workflows" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid var(--border-strong)' }}>Elastic Workflows</a> and <a href="https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid var(--border-strong)' }}>Agent Builder</a>
    </footer>
  );
}
