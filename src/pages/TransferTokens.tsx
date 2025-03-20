"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Address,
  getOrdersHistory,
  getPortfolio,
  getTokens,
  useOkto,
  UserPortfolioData,
} from "@okto_web3/react-sdk";
import { tokenTransfer } from "@okto_web3/react-sdk/userop";
import { getChains } from '@okto_web3/react-sdk';
import { useNavigate } from "react-router-dom";
import CopyButton from "../components/CopyButton";
import ViewExplorerURL from "../components/ViewExplorerURL";

// Types
interface TokenOption {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  caipId: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Components
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

function TwoStepTokenTransfer() {
  const oktoClient = useOkto();
  const navigate = useNavigate();

  // Form state
  const [chains, setChains] = useState<any[]>([]);
  const [tokens, setTokens] = useState<TokenOption[]>([]);
  const [portfolio, setPortfolio] = useState<UserPortfolioData>();
  const [portfolioBalance, setPortfolioBalance] = useState<any[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<{
    balance: string;
    usdtBalance: string;
    inrBalance: string;
  } | null>(null);

  // Transaction state
  const [jobId, setJobId] = useState<string | null>(null);
  const [userOp, setUserOp] = useState<any | null>(null);
  const [signedUserOp, setSignedUserOp] = useState<any | null>(null);
  const [orderHistory, setOrderHistory] = useState<any | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Helper functions
  const showModal = (modal: string) => setActiveModal(modal);
  const closeAllModals = () => setActiveModal(null);

  const resetForm = () => {
    setSelectedToken("");
    setAmount("");
    setRecipient("");
    setUserOp(null);
    setSignedUserOp(null);
    setJobId(null);
    setOrderHistory(null);
    setExplorerUrl(null);
    setError(null);
    closeAllModals();
  };

  const validateFormData = () => {
    const token = tokens.find((t) => t.symbol === selectedToken);
    if (!token) throw new Error("Please select a valid token");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      throw new Error("Please enter a valid amount");
    if (!recipient || !recipient.startsWith("0x"))
      throw new Error("Please enter a valid recipient address");

    return {
      amount: BigInt(amount),
      recipient: recipient as Address,
      token: token.address as Address,
      caip2Id: selectedChain,
    };
  };

  // Data fetching
  useEffect(() => {
    const fetchChains = async () => {
      try {
        setChains(await getChains(oktoClient));
      } catch (error: any) {
        console.error("Error fetching chains:", error);
        setError(`Failed to fetch chains: ${error.message}`);
      }
    };
    fetchChains();
  }, [oktoClient]);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!selectedChain) {
        setTokens([]);
        return;
      }

      setLoadingTokens(true);
      setError(null);

      try {
        const response = await getTokens(oktoClient);
        const filteredTokens = response
          .filter((token: any) => token.caipId === selectedChain)
          .map((token: any) => ({
            address: token.address,
            symbol: token.symbol,
            name: token.shortName || token.name,
            decimals: token.decimals,
            caipId: token.caipId,
          }));

        setTokens(filteredTokens);
      } catch (error: any) {
        console.error("Error fetching tokens:", error);
        setError(`Failed to fetch tokens: ${error.message}`);
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokens();
  }, [selectedChain, oktoClient]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await getPortfolio(oktoClient);
        setPortfolio(data);

        // Process portfolio data into a more usable format
        if (data?.groupTokens) {
          // Create a map of all tokens with their balances
          const tokenBalanceMap = new Map();

          // Process direct tokens in groupTokens
          data.groupTokens.forEach((group) => {
            // Some items in groupTokens are direct tokens
            if (group.aggregationType === "token") {
              tokenBalanceMap.set(group.symbol, {
                balance: group.balance,
                usdtBalance: group.holdingsPriceUsdt,
                inrBalance: group.holdingsPriceInr,
              });
            }

            // Some items have nested tokens
            if (group.tokens && group.tokens.length > 0) {
              group.tokens.forEach((token) => {
                tokenBalanceMap.set(token.symbol, {
                  balance: token.balance,
                  usdtBalance: token.holdingsPriceUsdt,
                  inrBalance: token.holdingsPriceInr,
                });
              });
            }
          });

          // If we have a selected token, update its balance
          if (selectedToken && tokenBalanceMap.has(selectedToken)) {
            setTokenBalance(tokenBalanceMap.get(selectedToken));
          } else {
            setTokenBalance(null);
          }

          // Store the map for later use
          setPortfolioBalance(
            Array.from(tokenBalanceMap.entries()).map(([symbol, data]) => ({
              symbol,
              ...data,
            }))
          );
        }
      } catch (error: any) {
        console.error("Error fetching portfolio:", error);
        setError(`Failed to fetch portfolio: ${error.message}`);
      }
    };

    fetchPortfolio();
  }, [oktoClient, selectedToken]);

  // Function to handle token selection
  const handleTokenSelect = (symbol: string) => {
    setSelectedToken(symbol);

    // Update token balance immediately if we have portfolio data
    if (portfolioBalance) {
      const tokenData = portfolioBalance.find((item) => item.symbol === symbol);
      setTokenBalance(tokenData || null);
    }
  };

  // Transaction handlers
  const handleGetOrderHistory = async (id?: string) => {
    const intentId = id || jobId;
    if (!intentId) {
      setError("No job ID available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const orders = await getOrdersHistory(oktoClient, {
        intentId,
        intentType: "TOKEN_TRANSFER",
      });
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
      const orders = await getOrdersHistory(oktoClient, {
        intentId: jobId,
        intentType: "TOKEN_TRANSFER",
      });
      setOrderHistory(orders?.[0]);
    } catch (error: any) {
      console.error("Error refreshing order history", error);
      setError(`Error refreshing transaction details: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransferToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const transferParams = validateFormData();
      // Note overher: you can directly import tokenTransfer from the @okto_web3/react-sdk
      // On doing so, you'll directly get the jobId and you won't have to follow the below code.
      const userOp = await tokenTransfer(oktoClient, transferParams);
      const signedOp = await oktoClient.signUserOp(userOp);
      const jobId = await oktoClient.executeUserOp(signedOp);

      setJobId(jobId);
      await handleGetOrderHistory(jobId);
      showModal("jobId");

      console.log("Transfer jobId:", jobId);
    } catch (error: any) {
      console.error("Error in token transfer:", error);
      setError(`Error in token transfer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenTransferUserOp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const transferParams = validateFormData();
      const userOp = await tokenTransfer(oktoClient, transferParams);
      setUserOp(userOp);
      showModal("unsignedOp");
      console.log("UserOp:", userOp);
    } catch (error: any) {
      console.error("Error in token transfer:", error);
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

  // Render form fields
  const renderForm = () => (
    <div className="space-y-4">
      {/* Network Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Select Network
        </label>
        <select
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
          value={selectedChain}
          onChange={(e) => {
            setSelectedChain(e.target.value);
            setSelectedToken("");
            setAmount("");
            setRecipient("");
          }}
          disabled={isLoading}
        >
          <option value="" disabled>
            Select a network
          </option>
          {chains.map((chain) => (
            <option key={chain.chainId} value={chain.caipId}>
              {chain.networkName} ({chain.caipId})
            </option>
          ))}
        </select>
      </div>

      {/* Token Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Select Token
        </label>
        <select
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
          value={selectedToken}
          onChange={(e) => handleTokenSelect(e.target.value)}
          disabled={isLoading || loadingTokens || !selectedChain}
        >
          <option value="" disabled>
            {loadingTokens
              ? "Loading tokens..."
              : !selectedChain
                ? "Select a network first"
                : tokens.length === 0
                  ? "No tokens available"
                  : "Select a token"}
          </option>
          {tokens.map((token) => (
            <option
              key={`${token.caipId}-${token.address}`}
              value={token.symbol}
            >
              {token.symbol} - {token.address || "native"}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Field */}
      <div>
        <label className="flex justify-between block text-sm font-medium text-gray-300 mb-1">
          <p>Amount (in smallest unit):</p>
          <p>
            {selectedChain && (
              <>
                Balance:{" "}
                {selectedToken &&
                portfolioBalance?.find((pb) => pb.symbol === selectedToken)
                  ?.balance !== undefined
                  ? Number(
                      portfolioBalance.find((pb) => pb.symbol === selectedToken)
                        ?.balance
                    ).toFixed(4)
                  : "N/A"}{" "}
                &nbsp; INR:{" "}
                {(selectedToken &&
                  portfolioBalance?.find((pb) => pb.symbol === selectedToken)
                    ?.inrBalance) ||
                  "N/A"}{" "}
                &nbsp; USDT:{" "}
                {(selectedToken &&
                  portfolioBalance?.find((pb) => pb.symbol === selectedToken)
                    ?.usdtBalance) ||
                  "N/A"}
              </>
            )}
          </p>
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount in smallest unit (e.g., wei)"
          disabled={isLoading}
        />
        <small className="text-gray-400">
          {selectedToken &&
            tokens.find((t) => t.symbol === selectedToken)?.decimals &&
            `This token has ${tokens.find((t) => t.symbol === selectedToken)?.decimals} decimals`}
        </small>
      </div>

      {/* Recipient Address */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Recipient Address
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          disabled={isLoading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-2">
        <button
          className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-blue-800 disabled:opacity-50"
          onClick={handleTransferToken}
          disabled={
            isLoading ||
            !selectedChain ||
            !selectedToken ||
            !amount ||
            !recipient
          }
        >
          {isLoading ? "Processing..." : "Transfer Token (Direct)"}
        </button>
        <button
          className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:bg-purple-800 disabled:opacity-50"
          onClick={handleTokenTransferUserOp}
          disabled={
            isLoading ||
            !selectedChain ||
            !selectedToken ||
            !amount ||
            !recipient
          }
        >
          {isLoading ? "Processing..." : "Create Token Transfer UserOp"}
        </button>
      </div>
    </div>
  );

  // Render modals
  const renderModals = () => (
    <>
      {/* Job ID Modal */}
      <Modal
        isOpen={activeModal === "jobId"}
        onClose={() => showModal("orderHistory")}
        title="Transaction Submitted"
      >
        <div className="space-y-4 text-white">
          <p>Your transaction has been submitted successfully.</p>
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
        title="Review Transaction"
      >
        <div className="space-y-4 text-white">
          <p>Please review your transaction details before signing.</p>
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
                <span className="text-gray-400">Token:</span> {selectedToken}
              </li>
              <li>
                <span className="text-gray-400">Amount:</span> {amount}
              </li>
              <li>
                <span className="text-gray-400">Recipient:</span> {recipient}
              </li>
              <li>
                <span className="text-gray-400">Network:</span>{" "}
                {chains.find((c) => c.caipId === selectedChain)?.networkName}
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
            Your transaction has been signed successfully and is ready to be
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

          {/* GET order History */}
          {orderHistory && (
            <>
              {orderHistory.status === "SUCCESSFUL" ? (
                <div className="flex justify-center w-full pt-2">
                  <ViewExplorerURL orderHistory={orderHistory} />
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
    </>
  );

  return (
    <div className="w-full bg-gray-900 min-h-screen">
      <div className="flex flex-col w-full max-w-2xl mx-auto p-6 space-y-6 bg-gray-900 rounded-lg shadow-xl justify-center items-center">
        <button
          onClick={() => navigate("/home")}
          className="w-fit py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black mb-8"
        >
          Home
        </button>
        <h1 className="text-2xl font-bold text-white text-center">
          Token Transfer
        </h1>
        <p className="text-white font-regular text-lg mb-6">
          For a detailed overview of Token Transfer intent, refer to our
          documentation on{" "}
          <a
            className="underline text-indigo-300"
            href="https://docs.okto.tech/docs/react-sdk/tokenTransfer"
            target="_blank"
            rel="noopener noreferrer"
          >
            Token Transfer
          </a>
          .
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {renderForm()}
      </div>
      {renderModals()}
    </div>
  );
}

export default TwoStepTokenTransfer;