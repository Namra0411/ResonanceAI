import { useAuth } from "../context/AuthContext.jsx";

const Me = () => {
  const { user, loading, logout } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Not logged in</p>;

  return (
    <div style={{ padding: 40 }}>
      <h2>You are logged in</h2>
      <p>Email: {user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default Me;
