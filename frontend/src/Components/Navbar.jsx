import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left" onClick={() => navigate("/documents")}>
        <img src="/logo.png" alt="ResonanceAI" />
        <span>ResonanceAI</span>
      </div>

      <div className="navbar-right">
        <button onClick={() => navigate("/search")} title="Search">
          🔍
        </button>
        <button onClick={logout} title="Logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
