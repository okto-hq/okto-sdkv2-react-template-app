import { GoogleLogin } from "@react-oauth/google";
import { useOkto } from "@okto_web3/react-sdk";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { ConfigContext } from "../../context/ConfigContext";
import * as authClient from "../../api/auth";
import type { Hex } from "viem";

export default function GoogleLoginComponent() {
  const oktoClient = useOkto();
  const navigate = useNavigate();
  const configContext = useContext(ConfigContext);

  const [mode, setMode] = useState<string>("sdk");
  const [clientPK, setClientPK] = useState<Hex>("0x");
  const [clientSWA, setClientSWA] = useState<Hex>("0x");
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    setMode(configContext.config.mode);
    setClientPK(configContext.config.clientPrivateKey);
    setClientSWA(configContext.config.clientSWA);
    setBaseUrl(configContext.config.apiUrl);
  }, [configContext]);

  const handleGoogleLogin = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential || "";
    if (idToken) {
      localStorage.setItem("googleIdToken", idToken);
      try {
        localStorage.removeItem("okto_session");
        if (mode === "api") {
          const provider = "google";
          const res = await authClient.authenticate(
            baseUrl,
            idToken,
            provider,
            clientPK,
            clientSWA
          );
          if (res.status == "success") {
            localStorage.setItem(
              "okto_session",
              JSON.stringify(res.sessionConfig)
            );
          }
        } else if (mode === "sdk") {
          await oktoClient.loginUsingOAuth(
            { idToken, provider: "google" },
            (session: any) => {
              localStorage.setItem("okto_session", JSON.stringify(session));
            }
          );
        }
        navigate("/home");
      } catch (error) {
        console.error("Authentication failed:", error);
        localStorage.removeItem("googleIdToken");
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <p className="text-gray-400 text-center">
        Sign in with your Google account
      </p>
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        theme="filled_black"
        size="large"
        shape="rectangular"
      />
    </div>
  );
}
