const Login = () => {
const login = () => {
  window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
};


  return (
    <div style={{ padding: 40 }}>
      <button onClick={login}>Login with Google</button>
    </div>
  );
};

export default Login;
