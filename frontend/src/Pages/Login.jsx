import "./Login.css";

const Login = () => {
  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  };

  return (
    <div className="landing-root">
      <div className="landing-content">
        {/* Big App Logo */}
        <img
          src="/logo.png"
          alt="ResonanceAI"
          className="landing-logo"
        />

        {/* Product Name */}
        <h1 className="landing-title">ResonanceAI</h1>

        {/* Hero Line */}
        <p className="landing-subtitle">
          Stop scrolling. Start finding.
        </p>

        {/* Explanation */}
        <p className="landing-description">
          Upload your PDFs and notes once.
          ResonanceAI makes them searchable forever —
          so you can instantly find what matters, when it matters.
        </p>

        {/* Feature Strip */}
        <div className="landing-features">
          <div className="feature">⚡ Finds things fast</div>
          <div className="feature">🧠 Understands meaning</div>
          <div className="feature">🔒 Private by default</div>
        </div>

        {/* CTA */}
        <button className="google-cta" onClick={login}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="google-icon"
          />
          Continue with Google
        </button>

        {/* Trust Line */}
        <p className="landing-footnote">
          Your documents stay yours. We don’t read them — we index them.
        </p>
      </div>
    </div>
  );
};

export default Login;
