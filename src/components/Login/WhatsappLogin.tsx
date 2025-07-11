import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useOkto } from "@okto_web3/react-sdk";
import { ConfigContext } from "../../context/ConfigContext";
import * as authClient from "../../api/auth";
import type { Hex } from "viem";

export default function WhatsappLogin() {
  const oktoClient = useOkto();
  const navigate = useNavigate();
  const configContext = useContext(ConfigContext);

  const [phoneNo, setPhoneNo] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [mode, setMode] = useState<string>("sdk");
  const [clientPK, setClientPK] = useState<Hex>("0x");
  const [clientSWA, setClientSWA] = useState<Hex>("0x");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [countryShortName, setCountryShortName] = useState<string>("IN");

  useEffect(() => {
    setStatus("send_OTP");
    setMode(configContext.config.mode);
    setClientPK(configContext.config.clientPrivateKey);
    setClientSWA(configContext.config.clientSWA);
    setBaseUrl(configContext.config.apiUrl);
  }, [configContext]);

  const sendOTPFlow = async (mode: string) => {
    let res: any;
    if (mode === "api") {
      res = await authClient.requestOTPForWhatsapp(
        baseUrl,
        phoneNo,
        countryShortName,
        clientPK,
        clientSWA
      );
    } else if (mode === "sdk") {
      res = await oktoClient.sendOTP(phoneNo, "whatsapp");
    }
    setToken(res.token);
    setStatus("verify_OTP");
    console.log("OTP sent:", res);
  };

  const resendOTPFlow = async (mode: string) => {
    let res: any;
    if (mode === "api") {
      // Not implemented for API, can call sendOTP again if needed
      res = await authClient.requestOTPForWhatsapp(
        baseUrl,
        phoneNo,
        countryShortName,
        clientPK,
        clientSWA
      );
    } else if (mode === "sdk") {
      res = await oktoClient.resendOTP(phoneNo, token, "whatsapp");
    }
    setToken(res.token);
    setStatus("verify_OTP");
    console.log("OTP resent:", res);
  };

  const verifyOTPFlow = async (mode: string) => {
    let res: any;
    if (mode === "api") {
      const idTokenRes = await authClient.verifyOTPForWhatsapp(
        baseUrl,
        phoneNo,
        countryShortName,
        otp,
        token,
        clientPK,
        clientSWA
      );
      const idToken = idTokenRes.auth_token;
      const provider = "okto";
      res = await authClient.authenticate(
        baseUrl,
        idToken,
        provider,
        clientPK,
        clientSWA
      );
      if (res.status == "success") {
        localStorage.setItem("okto_session", JSON.stringify(res.sessionConfig));
      }
    } else if (mode === "sdk") {
      res = await oktoClient.loginUsingWhatsApp(
        phoneNo,
        otp,
        token,
        (session: any) => {
          localStorage.setItem("okto_session", JSON.stringify(session));
        }
      );
    }
  };

  const handleWhatsappAction = async () => {
    try {
      localStorage.removeItem("okto_session");
      if (!phoneNo) return alert("Enter a valid phone number");

      if (status === "send_OTP") {
        await sendOTPFlow(mode);
      } else if (status === "resend_OTP") {
        await resendOTPFlow(mode);
      } else if (status === "verify_OTP") {
        await verifyOTPFlow(mode);
        navigate("/home");
      }
    } catch (err) {
      console.error("Whatsapp login error:", err);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <p className="text-gray-300 text-sm">
        Format:{" "}
        <code className="bg-gray-800 px-2 py-1 rounded text-blue-300">
          &lt;10-digit number&gt;
        </code>{" "}
        <br />
        <span className="text-gray-400 text-xs">
          Note: Country code IN is used by default
        </span>
      </p>
      <input
        type="tel"
        value={phoneNo}
        onChange={(e) => setPhoneNo(e.target.value)}
        placeholder="Enter your Phone Number"
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
        onClick={handleWhatsappAction}
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
          ? "Enter the OTP sent to your phone number"
          : "We'll send you a login code"}
      </p>
    </div>
  );
}
