"use client";
import { useEffect, useState } from "react";
import {
  Address,
  getChains,
  getOrdersHistory,
  getPortfolioNFT,
  nftTransfer,
  useOkto,
} from "@okto_web3/react-sdk";
import { useNavigate } from "react-router-dom";
import { nftTransfer as nftTransferUserOp } from "@okto_web3/react-sdk/userop";
import { nftTransfer as nftTransferMain } from "@okto_web3/react-sdk";
import CopyButton from "../components/CopyButton";
import ViewExplorerURL from "../components/ViewExplorerURL";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import * as intent from "../api/intent";
import * as explorer from "../api/explorer";

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) =>
  !isOpen ? null : (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );

const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
  </svg>
);

function TransferNFT() {
  const oktoClient = useOkto();
  const navigate = useNavigate();
  const { config } = useContext(ConfigContext);

  // State management
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chains, setChains] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [selectedNFT, setSelectedNFT] = useState<string>("");
  const [collectionAddress, setCollectionAddress] = useState<string>("");
  const [nftId, setNftId] = useState<string>("");
  const [recipientWalletAddress, setRecipientWalletAddress] =
    useState<string>("");
  const [feePayer, setFeePayer] = useState<string>("");
  const [amount, setAmount] = useState<string>("1");
  const [type, setType] = useState<string>("ERC721");
  const [balance, setBalance] = useState<string>("");
  const [sponsorshipEnabled, setSponsorshipEnabled] = useState(false);
  // Modal and transaction states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [userOp, setUserOp] = useState<any | null>(null);
  const [signedUserOp, setSignedUserOp] = useState<any | null>(null);
  const [orderHistory, setOrderHistory] = useState<any | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [estimateResponse, setEstimateResponse] = useState<any | null>(null);

  // Helper to get sessionConfig for API mode
  const getSessionConfig = () => {
    const session = localStorage.getItem("okto_session");
    return JSON.parse(session || "{}");
  };

  // Loading states
  const [loadingChains, setLoadingChains] = useState(true);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Utility functions
  const showModal = (modal: string) => setActiveModal(modal);
  const closeAllModals = () => setActiveModal(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetForm = () => {
    setSelectedChain("");
    setSelectedNFT("");
    setCollectionAddress("");
    setNftId("");
    setFeePayer("");
    setRecipientWalletAddress("");
    setAmount("1");
    setType("ERC721");
    setBalance("");
    setUserOp(null);
    setSignedUserOp(null);
    setJobId(null);
    closeAllModals();
  };

  // Fetch chains on component mount (API/SDK mode)
  useEffect(() => {
    const fetchChains = async () => {
      setLoadingChains(true);
      try {
        let chainsData;
        if (config.mode === "api") {
          const sessionConfig = getSessionConfig();
          const res = await explorer.getChains(config.apiUrl, sessionConfig);
          chainsData = res.data.network;
        } else {
          chainsData = await getChains(oktoClient);
        }
        setChains(chainsData);
      } catch (error: any) {
        console.error("Error fetching chains:", error);
        setError(`Failed to fetch chains: ${error.message}`);
      } finally {
        setLoadingChains(false);
      }
    };
    fetchChains();
  }, [oktoClient, config]);

  // Fetch NFTs when chain is selected (API/SDK mode)
  useEffect(() => {
    const fetchNfts = async () => {
      if (!selectedChain) {
        setPortfolio([]);
        return;
      }
      setLoadingNfts(true);
      setError("");
      try {
        let response;
        if (config.mode === "api") {
          const sessionConfig = getSessionConfig();
          const res = await explorer.getPortfolioNFT(
            config.apiUrl,
            sessionConfig
          );
          response = res.data;
        } else {
          response = await getPortfolioNFT(oktoClient);
        }
        const processedNfts = response.map((nft: any) => ({
          address: nft.collectionAddress,
          nft_id: nft.nftId,
          nft_type: nft.entityType,
          caipId: nft.caipId,
          name: nft.nftName,
          image: nft.image,
          quantity: nft.quantity,
        }));
        const filteredNfts = processedNfts.filter(
          (nft: any) => nft.caipId === selectedChain
        );
        setPortfolio(filteredNfts);
        setSelectedNFT("");
        setBalance("0");
      } catch (error: any) {
        console.error("Error fetching NFT:", error);
        setError(`Failed to fetch NFTs: ${error.message}`);
      } finally {
        setLoadingNfts(false);
      }
    };
    fetchNfts();
  }, [selectedChain, oktoClient, config]);

  // handle network change
  const handleNetworkChange = (e: any) => {
    const selectedCaipId = e.target.value;
    setSelectedChain(selectedCaipId);

    const selectedChainObj = chains.find(
      (chain) => chain.caipId === selectedCaipId
    );
    setSponsorshipEnabled(selectedChainObj?.sponsorshipEnabled || false);
  };
  // Validation function
  const validateFormData = (): {
    caip2Id: string;
    collectionAddress: Address;
    nftId: string;
    recipientWalletAddress: Address;
    amount: number;
    nftType: "ERC721" | "ERC1155";
  } => {
    if (selectedChain && sponsorshipEnabled) {
      if (!feePayer || !feePayer.startsWith("0x"))
        throw new Error("Please enter a valid feePayer address");
    }
    if (
      !selectedChain ||
      !collectionAddress ||
      !nftId ||
      !recipientWalletAddress ||
      !amount
    ) {
      throw new Error("Please fill in all required fields");
    }

    return {
      caip2Id: selectedChain,
      collectionAddress: collectionAddress as Address,
      nftId,
      recipientWalletAddress: recipientWalletAddress as Address,
      amount: Number(amount),
      nftType: type as "ERC721" | "ERC1155",
    };
  };

  const handleGetOrderHistory = async (id?: string) => {
    const intentId = id || jobId;
    if (!intentId) {
      setError("No job ID available");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let orders;
      if (config.mode === "api") {
        const sessionConfig = getSessionConfig();
        const res = await explorer.getOrderHistory(
          config.apiUrl,
          sessionConfig
        );
        orders = (res.data?.items || []).filter(
          (o: any) => (o.intent_id || o.intentId) === intentId
        );
      } else {
        orders = await getOrdersHistory(oktoClient, {
          intentId,
          intentType: "NFT_TRANSFER",
        });
      }
      setOrderHistory(orders?.[0]);
      console.log("Refreshed Order History:", orders);
      setActiveModal("orderHistory");
    } catch (error: any) {
      console.error("Error in fetching order history", error);
      setError(`Error fetching transaction details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrderHistory = async () => {
    if (!jobId) {
      setError("No job ID available to refresh");
      return;
    }
    setIsRefreshing(true);
    try {
      let orders;
      if (config.mode === "api") {
        const sessionConfig = getSessionConfig();
        const res = await explorer.getOrderHistory(
          config.apiUrl,
          sessionConfig
        );
        orders = (res.data?.items || []).filter(
          (o: any) => (o.intent_id || o.intentId) === jobId
        );
      } else {
        orders = await getOrdersHistory(oktoClient, {
          intentId: jobId,
          intentType: "NFT_TRANSFER",
        });
      }
      setOrderHistory(orders?.[0]);
    } catch (error: any) {
      console.error("Error refreshing order history", error);
      setError(`Error refreshing transaction details: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Transfer handlers
  const handleTransferNft = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const transferParams = validateFormData();
      let jobId;
      if (config.mode === "api") {
        const session = localStorage.getItem("okto_session");
        const sessionConfig = JSON.parse(session || "{}");
        const res = await intent.nftTransfer(
          config.apiUrl,
          transferParams.caip2Id,
          transferParams.collectionAddress,
          transferParams.nftId,
          transferParams.recipientWalletAddress,
          transferParams.amount,
          transferParams.nftType,
          sessionConfig,
          config.clientSWA,
          config.clientPrivateKey,
          sponsorshipEnabled ? feePayer : undefined
        );
        jobId = res.data?.jobId;
      } else {
        if (selectedChain && sponsorshipEnabled) {
          jobId = await nftTransferMain(
            oktoClient,
            transferParams,
            feePayer as Address
          );
        } else {
          jobId = await nftTransferMain(oktoClient, transferParams);
        }
      }
      setJobId(jobId);
      await handleGetOrderHistory(jobId);
      showModal("jobId");
    } catch (error: any) {
      console.error("Error in NFT transfer:", error);
      setError(`Error in NFT transfer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNftTransferUserOp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const transferParams = validateFormData();
      let userOp;
      if (selectedChain && sponsorshipEnabled) {
        userOp = await nftTransfer(
          oktoClient,
          transferParams,
          feePayer as Address
        );
      } else {
        userOp = await nftTransfer(oktoClient, transferParams);
      }
      setUserOp(userOp);
      showModal("unsignedOp");
      console.log("UserOp:", userOp);
    } catch (error: any) {
      console.error("Error in creating user operation:", error);
      setError(`Error in creating user operation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUserOp = async () => {
    if (!userOp) {
      setError("No transaction to sign");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const signedOp = await oktoClient.signUserOp(userOp);
      setSignedUserOp(signedOp);
      showModal("signedOp");
      console.log("Signed UserOp", signedOp);
    } catch (error: any) {
      console.error("Error in signing the userop:", error);
      setError(`Error in signing transaction: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteUserOp = async () => {
    if (!signedUserOp) {
      setError("No signed transaction to execute");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const jobId = await oktoClient.executeUserOp(signedUserOp);
      setJobId(jobId);
      await handleGetOrderHistory(jobId);
      showModal("jobId");
      console.log("Job Id", jobId);
    } catch (error: any) {
      console.error("Error in executing the userop:", error);
      setError(`Error in executing transaction: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNftTransferEstimate = async () => {
    if (config.mode === "sdk") return;
    setIsLoading(true);
    setError(null);
    try {
      const transferParams = validateFormData();
      const session = localStorage.getItem("okto_session");
      const sessionConfig = JSON.parse(session || "{}");
      const res = await intent.nftTransferEstimate(
        config.apiUrl,
        transferParams.caip2Id,
        transferParams.collectionAddress,
        transferParams.nftId,
        transferParams.recipientWalletAddress,
        transferParams.amount,
        transferParams.nftType,
        sessionConfig,
        config.clientSWA,
        config.clientPrivateKey,
        sponsorshipEnabled ? feePayer : undefined
      );
      setEstimateResponse(res.data);
      showModal("estimate");
    } catch (error: any) {
      setError(error.message || "Error in NFT transfer estimate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNftTransferExecuteAfterEstimate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const session = localStorage.getItem("okto_session");
      const sessionConfig = JSON.parse(session || "{}");
      const res = await intent.nftTransferExecuteAfterEstimate(
        config.apiUrl,
        estimateResponse.userOps,
        sessionConfig
      );
      setJobId(res.data?.jobId);
      await handleGetOrderHistory(res.data?.jobId);
      showModal("jobId");
    } catch (error: any) {
      setError(error.message || "Error in NFT transfer execute after estimate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNFTSelection = (e: any) => {
    const selectedValue = e.target.value;
    setSelectedNFT(selectedValue);

    const [selectedAddress, selectedNftId] = selectedValue.split("-");

    const selectedNft = portfolio.find(
      (nft) => nft.address === selectedAddress && nft.nft_id === selectedNftId
    );

    if (selectedNft) {
      setCollectionAddress(selectedNft.address);
      setNftId(selectedNft.nft_id);
      setType(selectedNft.nft_type || "ERC721");
      setBalance(parseFloat(selectedNft.quantity).toFixed(2));
    } else {
      setBalance("");
    }
  };

  // Render modals
  const renderModals = () => (
    <>
      {/* Job ID Modal */}
      <Modal
        isOpen={activeModal === "jobId"}
        onClose={closeAllModals}
        title="NFT Transfer Submitted"
      >
        <div className="space-y-4 text-white">
          <p>Your NFT transfer has been submitted successfully.</p>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-300 mb-1">Job ID:</p>
            <CopyButton text={jobId ?? ""} />
            <p className="font-mono break-all">{jobId}</p>
          </div>
          <div className="flex justify-center pt-2">
            <button
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors w-full"
              onClick={() => handleGetOrderHistory()}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Check Job Status"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unsigned Transaction Modal */}
      <Modal
        isOpen={activeModal === "unsignedOp"}
        onClose={closeAllModals}
        title="Review NFT Transfer"
      >
        <div className="space-y-4 text-white">
          <p>Please review your NFT transfer details before signing.</p>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-300 mb-1">Transaction Details:</p>
            <div className="bg-gray-900 p-2 rounded font-mono text-sm overflow-auto max-h-40">
              <CopyButton text={JSON.stringify(userOp, null, 2) ?? ""} />
              <pre>{JSON.stringify(userOp, null, 2)}</pre>
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-300 mb-1">Summary:</p>
            <ul className="space-y-1">
              <li>
                <span className="text-gray-400">NFT:</span> {selectedNFT}
              </li>
              <li>
                <span className="text-gray-400">Collection Address:</span>{" "}
                {collectionAddress}
              </li>
              <li>
                <span className="text-gray-400">NFT ID:</span> {nftId}
              </li>
              <li>
                <span className="text-gray-400">Amount:</span> {amount}
              </li>
              <li>
                <span className="text-gray-400">Recipient:</span>{" "}
                {recipientWalletAddress}
              </li>
              <li>
                <span className="text-gray-400">Network:</span>
                {selectedChain}
              </li>
            </ul>
          </div>
          <div className="flex justify-center pt-2">
            <button
              className="p-3 bg-green-600 hover:bg-green-700 text-white rounded transition-colors w-full"
              onClick={handleSignUserOp}
              disabled={isLoading}
            >
              {isLoading ? "Signing..." : "Sign Transaction"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Signed Transaction Modal */}
      <Modal
        isOpen={activeModal === "signedOp"}
        onClose={closeAllModals}
        title="Sign Completed"
      >
        <div className="space-y-4 text-white">
          <p>
            Your NFT transfer has been signed successfully and is ready to be
            executed.
          </p>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-sm text-gray-300 mb-1">Signed Transaction:</p>
            <div className="bg-gray-900 p-2 rounded font-mono text-sm overflow-auto max-h-40">
              <CopyButton text={JSON.stringify(signedUserOp, null, 2) ?? ""} />
              <pre>{JSON.stringify(signedUserOp, null, 2)}</pre>
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <button
              className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors w-full"
              onClick={handleExecuteUserOp}
              disabled={isLoading}
            >
              {isLoading ? "Executing..." : "Execute Transaction"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Order History Modal */}
      <Modal
        isOpen={activeModal === "orderHistory"}
        onClose={closeAllModals}
        title="Transaction Details"
      >
        <div className="space-y-4 text-white">
          <div className="flex justify-between items-center">
            <p>Transaction Details:</p>
          </div>

          {/* Order History Details */}
          {orderHistory ? (
            <div className="bg-gray-700 p-4 rounded-md">
              <p>
                <span className="font-semibold">Intent ID:</span>{" "}
                {orderHistory.intentId}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {orderHistory.status}
              </p>
              <p>
                <span className="font-semibold">Transaction Hash:</span>
              </p>
              <pre className="break-all whitespace-pre-wrap overflow-auto bg-gray-800 p-2 rounded-md text-sm max-w-full">
                <CopyButton
                  text={orderHistory.downstreamTransactionHash[0] ?? ""}
                />
                {orderHistory.downstreamTransactionHash[0]}
              </pre>
            </div>
          ) : (
            <p className="text-gray-400">No order history available.</p>
          )}

          {/* View in Explorer (if URL exists) */}
          {orderHistory && (
            <>
              {orderHistory.status === "SUCCESSFUL" ? (
                <div className="flex justify-center pt-2">
                  {orderHistory.downstreamTransactionHash?.[0] && (
                    <>
                      <ViewExplorerURL orderHistory={orderHistory} />
                      <p>
                        If you are unable to see the View Explorer button. You
                        can go to the respective explorer and check the Internal
                        Transaction for your account.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={refreshOrderHistory}
                    className="flex gap-x-3 justify-center items-center p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors w-full text-center"
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <span>Refreshing...</span>
                    ) : (
                      <>
                        <RefreshIcon /> Refresh
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Reset Form Button */}
          <div className="flex justify-center pt-2">
            <button
              className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors w-full"
              onClick={resetForm}
            >
              Create New Transaction
            </button>
          </div>
        </div>
      </Modal>
      {/* Estimate Transaction Modal */}
      <Modal
        isOpen={activeModal === "estimate"}
        onClose={closeAllModals}
        title="Review NFT Transfer Estimate"
      >
        <div className="space-y-4 text-white">
          {estimateResponse ? (
            <>
              <p>Estimate details for your transaction.</p>
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-sm text-gray-300 mb-1">
                  Estimate Transaction Details:
                </p>
                <div className="bg-gray-900 p-2 rounded font-mono text-sm overflow-auto max-h-80">
                  <CopyButton
                    text={JSON.stringify(estimateResponse, null, 2)}
                  />
                  <pre>{JSON.stringify(estimateResponse, null, 2)}</pre>
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-sm text-gray-300 mb-1">Summary:</p>
                <ul className="space-y-1">
                  <li>
                    <span className="text-gray-400">NFT:</span> {selectedNFT}
                  </li>
                  <li>
                    <span className="text-gray-400">Collection Address:</span>{" "}
                    {collectionAddress}
                  </li>
                  <li>
                    <span className="text-gray-400">NFT ID:</span> {nftId}
                  </li>
                  <li>
                    <span className="text-gray-400">Amount:</span> {amount}
                  </li>
                  <li>
                    <span className="text-gray-400">Recipient:</span>{" "}
                    {recipientWalletAddress}
                  </li>
                  <li>
                    <span className="text-gray-400">Network:</span>
                    {selectedChain}
                  </li>
                </ul>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-sm text-gray-300 mb-1">UserOp:</p>
                <div className="bg-gray-900 p-2 rounded font-mono text-sm overflow-auto max-h-80">
                  <CopyButton
                    text={JSON.stringify(estimateResponse.userOps, null, 2)}
                  />
                  <pre>{JSON.stringify(estimateResponse.userOps, null, 2)}</pre>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  className="p-3 bg-green-600 hover:bg-green-700 text-white rounded transition-colors w-full"
                  onClick={handleNftTransferExecuteAfterEstimate}
                  disabled={isLoading}
                >
                  {isLoading ? "Executing..." : "Execute (UserOp)"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-400">No estimate available.</p>
          )}
        </div>
      </Modal>
    </>
  );

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 bg-gray-900 w-full">
      {renderModals()}

      <button
        onClick={() => navigate("/home")}
        className="w-fit py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black mb-8"
      >
        Home
      </button>

      <h1 className="text-white font-bold text-3xl mb-8">Transfer NFT</h1>
      <p className="text-white font-regular text-lg mb-6">
        For a detailed overview of Transfer NFT intent, refer to our
        documentation on{" "}
        <a
          className="underline text-indigo-300"
          href="https://docs.okto.tech/docs/react-sdk/nftTransfer"
          target="_blank"
          rel="noopener noreferrer"
        >
          NFT Transfer
        </a>
        .
      </p>

      {error && (
        <div className="w-full max-w-2xl bg-red-900/50 border border-red-700 text-red-100 p-3 mb-4 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 w-full max-w-2xl">
        <div className="flex flex-col items-center bg-black p-6 rounded-lg shadow-xl border border-gray-800">
          {/* Network Selection */}
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select Network
            </label>
            <select
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
              value={selectedChain}
              onChange={handleNetworkChange}
              disabled={loadingChains}
            >
              <option value="" disabled>
                {loadingChains ? "Loading chains..." : "Select a network"}
              </option>
              {chains &&
                Array.isArray(chains) &&
                chains.map((chain) => (
                  <option
                    key={chain.chainId || chain.chain_id}
                    value={chain.caipId || chain.caip_id}
                  >
                    {chain.networkName || chain.network_name} (
                    {chain.caipId || chain.caip_id})
                  </option>
                ))}
            </select>
          </div>

          {selectedChain && (
            <p className="mt-2 text-sm text-gray-300 border border-indigo-700 p-2 my-2">
              {sponsorshipEnabled
                ? "Gas sponsorship is available ✅"
                : "⚠️ Sponsorship is not activated for this chain, the user must hold native tokens to proceed with the transfer. You can get the token from the respective faucets if using testnets"}
            </p>
          )}

          {/* Feepayer address  */}
          {selectedChain && sponsorshipEnabled && (
            <div className="w-full mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Feepayer Address
              </label>
              <input
                type="text"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                value={feePayer}
                onChange={(e) => setFeePayer(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>
          )}

          {/* NFT Selection */}
          {selectedChain && (
            <div className="w-full mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select NFT
              </label>
              <select
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
                value={selectedNFT}
                onChange={handleNFTSelection}
                disabled={loadingNfts || !selectedChain}
              >
                <option value="" disabled>
                  {loadingNfts
                    ? "Loading NFTs..."
                    : !selectedChain
                      ? "Select a network first"
                      : portfolio.length === 0
                        ? "No NFTs available"
                        : "Select an NFT"}
                </option>
                {portfolio.map((nft) => (
                  <option
                    key={`${nft.address}-${nft.nft_id}`}
                    value={`${nft.address}-${nft.nft_id}`}
                  >
                    {nft.name || `NFT #${nft.nft_id}`} (
                    {nft.nft_type || "ERC721"})
                  </option>
                ))}
              </select>
              {portfolio.length === 0 && !loadingNfts && selectedChain && (
                <p className="text-yellow-400 text-sm mt-1">
                  No NFTs found for this network. You can enter details manually
                  below.
                </p>
              )}
            </div>
          )}

          {/* Collection Address */}
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Collection Address
            </label>
            <input
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={collectionAddress}
              onChange={(e) => setCollectionAddress(e.target.value)}
              placeholder="Enter Collection Address"
            />
          </div>

          {/* NFT ID */}
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              NFT ID
            </label>
            <input
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={nftId}
              onChange={(e) => setNftId(e.target.value)}
              placeholder="Enter NFT ID"
            />
          </div>

          {/* Recipient Wallet Address */}
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Recipient Wallet Address
            </label>
            <input
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={recipientWalletAddress}
              onChange={(e) => setRecipientWalletAddress(e.target.value)}
              placeholder="Enter Recipient Wallet Address"
            />
          </div>

          {/* Amount */}
          <div className="w-full mb-4">
            <label className="justify-between block text-sm font-medium text-gray-300 mb-1">
              <span>Amount</span>
              <span className="mr-2">NFT Balance: {balance}</span>
            </label>
            <input
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter Amount"
              type="number"
              min="1"
            />
          </div>

          {/* NFT Type */}
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              NFT Type
            </label>
            <select
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="ERC721">ERC721</option>
              <option value="ERC1155">ERC1155</option>
            </select>
          </div>

          {/* Transfer Buttons */}
          <div className="flex gap-4 pt-2 w-full">
            {/* Direct Execute (API or SDK) */}
            <button
              className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-blue-800 disabled:opacity-50"
              onClick={handleTransferNft}
              disabled={
                isLoading ||
                !selectedChain ||
                !selectedNFT ||
                !amount ||
                !recipientWalletAddress
              }
            >
              Transfer NFT (Direct Execute)
            </button>
            {/* UserOp (SDK only) */}
            {config.mode === "sdk" && (
              <button
                className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-blue-800 disabled:opacity-50"
                onClick={handleNftTransferUserOp}
                disabled={
                  isLoading ||
                  !selectedChain ||
                  !selectedNFT ||
                  !amount ||
                  !recipientWalletAddress
                }
              >
                Create NFT Transfer UserOp
              </button>
            )}
            {/* Estimate + Execute (API only) */}
            {config.mode === "api" && (
              <button
                className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:bg-green-800 disabled:opacity-50"
                onClick={handleNftTransferEstimate}
                disabled={
                  isLoading ||
                  !selectedChain ||
                  !selectedNFT ||
                  !amount ||
                  !recipientWalletAddress
                }
              >
                NFT Transfer (Estimate + Execute)
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default TransferNFT;
