import { useOkto } from "@okto_web3/react-sdk";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const oktoClient = useOkto();
  const navigate = useNavigate();

  /**
   * useEffect hook to handle authentication flow:
   * 1. Check if user is already authenticated with Okto
   * 2. If not, check for stored Google token
   * 3. If token exists, attempt authentication with Okto
   */
  useEffect(() => {
    if (oktoClient.isLoggedIn()) {
      console.log("logged in");
      navigate("/home");
      return;
    }

    // If not authenticated with Okto, check for stored Google token
    const storedToken = localStorage.getItem("googleIdToken");
    if (storedToken) {
      console.log("storedToken detected");
      handleAuthenticate(storedToken);
    }
  }, [oktoClient.isLoggedIn()]);

  // Authenticates user with Okto using Google ID token
  const handleAuthenticate = async (idToken: string) => {
    try {
      const user = await oktoClient.loginUsingOAuth({
        idToken: idToken,
        provider: "google",
      } , (session: any) => {
        // Store the session info securely
        console.log("session", session);
        localStorage.setItem("okto_session", JSON.stringify(session));
      });
      console.log("Authenticated with Okto:", user);
      navigate("/home");
    } catch (error) {
      console.error("Authentication failed:", error);

      // Remove invalid token from storage
      localStorage.removeItem("googleIdToken");
    }
  };

  // Handles successful Google login
  // 1. Stores the ID token in localStorage
  // 2. Initiates Okto authentication
  const handleGoogleLogin = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential || "";
    if (idToken) {
      localStorage.setItem("googleIdToken", idToken);
      handleAuthenticate(idToken);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12 bg-gray-900">
      <div className="flex flex-col items-center bg-black p-8 rounded-lg shadow-xl border border-gray-800 w-full max-w-md">
        <h1 className="text-white font-bold text-3xl mb-8">Welcome to Okto</h1>
        <div className="w-full flex flex-col items-center space-y-4">
          <p className="text-gray-400 text-center mb-4">
            Please sign in with your Google account to continue
          </p>
          <div className="w-full flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              theme="filled_black"
              size="large"
              shape="rectangular"
            />
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate("/home")}
        className="px-6 py-3 mt-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-center font-medium"
      >
        Go to homepage
      </button>
    </main>
  );
}
