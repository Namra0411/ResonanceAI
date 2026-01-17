import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Me from "./Pages/Me";
import Documents from "./Pages/Documents";
import Search from "./Pages/Search";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/me" element={<Me />} />
        <Route path="/documents" element={<Documents />} />
              <Route path="/search" element={<Search />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
