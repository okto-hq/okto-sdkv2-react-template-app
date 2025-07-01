import { Route, Routes } from "react-router-dom";
import "./App.css";
import Homepage from "./Homepage";
import LoginPage from "./LoginPage";
import CreateNft from "./pages/CreateNft";
import RawTransaction from "./pages/RawTransaction";
import TransferNFT from "./pages/TransferNFT";
import TransferTokens from "./pages/TransferTokens";
import RawRead from "./pages/RawRead";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<Homepage />} />

        <Route path="/rawRead" element={<RawRead />} />
        <Route path="/transfertoken" element={<TransferTokens />} />
        <Route path="/transfernft" element={<TransferNFT />} />
        <Route path="/createnftcollection" element={<CreateNft />} />
        <Route path="/rawtransaction" element={<RawTransaction />} />
      </Routes>
    </>
  );
}

export default App;
