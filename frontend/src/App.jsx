import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Me from "./Pages/Me";
import Documents from "./Pages/Documents";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/me" element={<Me />} />
        <Route path="/documents" element={<Documents />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
