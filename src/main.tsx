import { OktoClientConfig, OktoProvider } from "@okto_web3/react-sdk";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import Navbar from "./components/Navbar.tsx";

const config: OktoClientConfig = {
  environment: import.meta.env.VITE_OKTO_ENVIRONMENT,
  clientPrivateKey: import.meta.env.VITE_OKTO_CLIENT_PRIVATE_KEY,
  clientSWA: import.meta.env.VITE_OKTO_CLIENT_SWA,
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <OktoProvider config={config}>
          <Navbar />
          <App />
        </OktoProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
