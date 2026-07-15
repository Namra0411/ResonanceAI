import "./Login.css";

const Login = () => {
  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  };

  return (
    <div className="landing-root">
      <div className="landing-grid" aria-hidden="true" />

      <div className="landing-content">
        {/* Wordmark: two vectors converging to a point — reads as both "V" and the mechanic */}
        <div className="landing-wordmark">
          <svg
            className="vectra-glyph"
            viewBox="0 0 40 40"
            aria-hidden="true"
            focusable="false"
          >
            <line x1="4" y1="6" x2="20" y2="34" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="36" y1="6" x2="20" y2="34" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
            <circle cx="20" cy="34" r="3" fill="currentColor" />
          </svg>
          <span className="eyebrow">Vector Document Search</span>
        </div>

        {/* Title */}
        <h1 className="landing-title">VECTRA</h1>

        {/* Hero line */}
        <p className="landing-subtitle">
          Meaning has a location. <em>Vectra</em> finds it.
        </p>

        {/* Signature: scattered vectors converging on the match */}
        <svg
          className="landing-vectorfield"
          viewBox="0 0 1000 140"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <marker id="arrowCool" viewBox="0 0 10 10" refX="8" refY="5"
                     markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill="#4FD8E0" />
            </marker>
            <marker id="arrowWarm" viewBox="0 0 10 10" refX="8" refY="5"
                     markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill="#FF6B4A" />
            </marker>
            <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF6B4A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FF6B4A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* scattered, chaotic vectors — unorganized document chunks */}
          <g stroke="#4FD8E0" strokeWidth="1.6" opacity="0.7">
            <line x1="30" y1="40" x2="55" y2="20" markerEnd="url(#arrowCool)" />
            <line x1="80" y1="90" x2="100" y2="115" markerEnd="url(#arrowCool)" />
            <line x1="140" y1="30" x2="170" y2="55" markerEnd="url(#arrowCool)" />
            <line x1="190" y1="105" x2="220" y2="80" markerEnd="url(#arrowCool)" />
            <line x1="250" y1="55" x2="285" y2="35" markerEnd="url(#arrowCool)" />
            <line x1="310" y1="100" x2="345" y2="90" markerEnd="url(#arrowCool)" />
            <line x1="370" y1="45" x2="405" y2="60" markerEnd="url(#arrowCool)" />
          </g>

          {/* transitional — starting to align */}
          <g stroke="#7FD9C4" strokeWidth="1.7" opacity="0.8">
            <line x1="440" y1="75" x2="480" y2="70" markerEnd="url(#arrowCool)" />
            <line x1="500" y1="65" x2="545" y2="68" markerEnd="url(#arrowCool)" />
            <line x1="560" y1="78" x2="605" y2="72" markerEnd="url(#arrowCool)" />
          </g>

          {/* the resolved match */}
          <line x1="630" y1="70" x2="800" y2="70" stroke="#FF6B4A"
                strokeWidth="2.4" markerEnd="url(#arrowWarm)" />
          <circle cx="820" cy="70" r="30" fill="url(#targetGlow)" />
          <circle cx="820" cy="70" r="4" fill="#FF6B4A" />
          <circle cx="820" cy="70" r="11" fill="none" stroke="#FF6B4A" strokeWidth="1.2" opacity="0.5" />
        </svg>

        {/* Explanation */}
        <p className="landing-description">
          Upload a document once. Ask anything, in your own words —
          Vectra converts meaning into coordinates and returns the
          nearest match, not just the nearest keyword.
        </p>

        {/* Instrument readout */}
        <div className="landing-readout">
          <div className="readout-cell">
            <span className="readout-label">Match</span>
            <span className="readout-value">Nearest-neighbor</span>
          </div>
          <div className="readout-divider" />
          <div className="readout-cell">
            <span className="readout-label">Read</span>
            <span className="readout-value">Semantic</span>
          </div>
          <div className="readout-divider" />
          <div className="readout-cell">
            <span className="readout-label">Access</span>
            <span className="readout-value">Private</span>
          </div>
        </div>

        {/* CTA */}
        <button className="google-cta" onClick={login}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            className="google-icon"
          />
          Continue with Google
        </button>

        {/* Trust line */}
        <p className="landing-footnote">
          Your documents stay yours — we index them, we don&rsquo;t read them.
        </p>
      </div>
    </div>
  );
};

export default Login;