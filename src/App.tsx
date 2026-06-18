import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import LoginPage from "./components/LoginPage";

function App() {
  return (
    <main className="w-full h-screen bg-[#110f14]">
      <LoginPage />
    </main>
  );
}

export default App;