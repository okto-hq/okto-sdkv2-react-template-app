import { useOkto } from "@okto_web3/react-sdk";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import Homepage from "./Homepage";
import LoginPage from "./LoginPage";
import CreateNft from "./pages/CreateNft";
import RawTransaction from "./pages/RawTransaction";
import TransferNFT from "./pages/TransferNFT";
import TransferTokens from "./pages/TransferTokens";

function App() {
  const oktoClient = useOkto();

  //check if user is already logged in
  const isloggedIn = oktoClient.isLoggedIn();

  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<Homepage />} />

        <Route path="/transfertoken" element={<TransferTokens />} />
        <Route path="/transfernft" element={<TransferNFT />} />
        <Route path="/createnftcollection" element={<CreateNft />} />
        <Route path="/rawtransaction" element={<RawTransaction />} />
      </Routes>
    </>
  );
}

export default App;
