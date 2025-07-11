import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOkto } from "@okto_web3/react-sdk";
import { ConfigContext } from "../../context/ConfigContext";
import * as authClient from "../../api/auth";
import type { Hex } from "viem";

type Mode = "api" | "sdk";

export default function EmailLogin() {
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [status, setStatus] = useState<string>("send_OTP");
  const [token, setToken] = useState<string>("");
  const [mode, setMode] = useState<Mode>("sdk");
  const [clientPK, setClientPK] = useState<Hex>("0x");
  const [clientSWA, setClientSWA] = useState<Hex>("0x");
  const [baseUrl, setBaseUrl] = useState<string>("");

  const oktoClient = useOkto();
  const navigate = useNavigate();
  const configContext = useContext(ConfigContext);

  const sendOTPFlow = async (mode: Mode) => {
    let res: any;
    if (mode === "api") {
      res = await authClient.requestOTPForEmail(
        baseUrl,
        email,
        clientPK,
        clientSWA
      );
    } else if (mode === "sdk") {
      res = await oktoClient.sendOTP(email, "email");
    }
    setToken(res.token);
    setStatus("verify_OTP");
    console.log("OTP sent:", res);
  };

  const resendOTPFlow = async (mode: string) => {
    let res: any;
    if (mode === "api") {
      // not sure resend api flow
      return;
    } else if (mode === "sdk") {
      res = await oktoClient.resendOTP(email, token, "email");
    }
    setToken(res.token);
    setStatus("verify_OTP");
    console.log("OTP resent:", res);
  };

  const verifyOTPFlow = async (mode: string) => {
    console.log(mode);
    console.log(email);
    console.log(otp);
    console.log(token);
    let res: any;
    if (mode === "api") {
      const idTokenRes = await authClient.verifyOTPForEmail(
        baseUrl,
        email,
        otp,
        token,
        clientPK,
        clientSWA
      );
      const idToken = idTokenRes.auth_token;
      console.log("id token", idToken);
      const provider = "okto";
      res = await authClient.authenticate(
        baseUrl,
        idToken,
        provider,
        clientPK,
        clientSWA
      );
      console.log("sessionConfig:", res.sessionConfig);
      if (res.status == "success") {
        localStorage.setItem("okto_session", JSON.stringify(res.sessionConfig));
      }
    } else if (mode === "sdk") {
      res = await oktoClient.loginUsingEmail(
        email,
        otp,
        token,
        (session: any) => {
          localStorage.setItem("okto_session", JSON.stringify(session));
        }
      );
    }
  };

  const handleEmailAction = async () => {
    try {
      localStorage.removeItem("okto_session");
      if (!email) return alert("Enter a valid email");
      if (status === "send_OTP") {
        sendOTPFlow(mode);
      } else if (status === "resend_OTP") {
        resendOTPFlow(mode);
      } else if (status === "verify_OTP") {
        await verifyOTPFlow(mode);
        navigate("/home");
      }
    } catch (err) {
      console.error("Email login error:", err);
    }
  };

  useEffect(() => {
    setEmail(localStorage.getItem("okto_email") || "");
    setStatus(localStorage.getItem("okto_status") || "send_OTP");
    setMode(configContext.config.mode);
    setClientPK(configContext.config.clientPrivateKey);
    setClientSWA(configContext.config.clientSWA);
    setBaseUrl(configContext.config.apiUrl);
  }, []);

  return (
    <div className="flex flex-col space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your Email"
        className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {status === "verify_OTP" && (
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      )}

      <button
        onClick={handleEmailAction}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
      >
        {status === "verify_OTP" ? "Verify OTP" : "Send OTP"}
      </button>

      {status === "verify_OTP" && (
        <button
          type="button"
          onClick={() => setStatus("resend_OTP")}
          className="text-sm text-blue-400 hover:underline text-center w-full"
        >
          Resend OTP
        </button>
      )}

      <p className="text-gray-400 text-sm text-center">
        {status === "verify_OTP"
          ? "Enter the OTP sent to your email"
          : "We'll send you a login code"}
      </p>
    </div>
  );
}
