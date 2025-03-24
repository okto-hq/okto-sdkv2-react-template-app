"use client";
import { useEffect, useState } from "react";
import {
  useOkto,
  evmRawTransaction,
  Address,
  getChains,
  getAccount,
  getOrdersHistory,
} from "@okto_web3/react-sdk";
import { evmRawTransaction as evmRawTransactionUserop } from "@okto_web3/react-sdk/userop";
import { useNavigate } from "react-router-dom";
import CopyButton from "../components/CopyButton";
import ViewExplorerURL from "../components/ViewExplorerURL";

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

function EVMRawTransaction() {
  const oktoClient = useOkto();
  const navigate = useNavigate();

  const [chains, setChains] = useState<any[]>([]);
  const [selectedChain, setSelectedChain] = useState<any>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sponsorshipEnabled, setSponsorshipEnabled] = useState(false);
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction state
  const [jobId, setJobId] = useState<string | null>(null);
  const [userOp, setUserOp] = useState<any | null>(null);
  const [signedUserOp, setSignedUserOp] = useState<any | null>(null);
  const [orderHistory, setOrderHistory] = useState<any | null>(null);

  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Helper functions
  const showModal = (modal: string) => setActiveModal(modal);
  const closeAllModals = () => setActiveModal(null);

  const resetForm = () => {
    setSelectedChain("");
    setValue("");
    setFrom("");
    setTo("");
    setData("");
    setUserOp(null);
    setSignedUserOp(null);
    setJobId(null);
    setOrderHistory(null);
    setError(null);
    closeAllModals();
  };

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedChains, fetchedAccounts] = await Promise.all([
          getChains(oktoClient),
          getAccount(oktoClient),
        ]);
        setChains(fetchedChains);
        setAccounts(fetchedAccounts);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError(`Failed to fetch data: ${error.message}`);
      }
    };

    fetchData();
  }, [oktoClient]);

  useEffect(() => {
    if (!selectedChain) {
      setFrom(""); // Reset if no chain is selected
      return;
    }

    const matchedAccount = accounts.find(
      (account) => account.caipId === selectedChain
    );
    setFrom(matchedAccount ? matchedAccount.address : "");
  }, [selectedChain, accounts]);

  // handle network change
  const handleNetworkChange = (e: any) => {
    const selectedCaipId = e.target.value;
    setSelectedChain(selectedCaipId);

    const selectedChainObj = chains.find(
      (chain) => chain.caipId === selectedCaipId
    );
    setSponsorshipEnabled(selectedChainObj?.sponsorshipEnabled || false);
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
        intentType: "RAW_TRANSACTION",
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
        intentType: "RAW_TRANSACTION",
      });
      console.log("Order ", orders?.[0]);
      setOrderHistory(orders?.[0]);
    } catch (error: any) {
      console.error("Error refreshing order history", error);
      setError(`Error refreshing transaction details: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateUserOp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rawTransactionIntentParams = {
        caip2Id: selectedChain,
        transaction: {
          from: from as Address,
          to: to as Address,
          value: BigInt(value),
          data: (data ? data : undefined) as any,
        },
      };
      console.log("Creating UserOp with params:", rawTransactionIntentParams);
      const createdUserOp = await evmRawTransactionUserop(
        oktoClient,
        rawTransactionIntentParams
      );
      setUserOp(createdUserOp);
      showModal("unsignedOp");
    } catch (error: any) {
      console.error("Error creating UserOp:", error);
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
      console.error("Error signing UserOp:", error);
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
      console.error("Error executing UserOp:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEVMRawTransaction = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rawTransactionIntentParams = {
        caip2Id: selectedChain,
        transaction: {
          from: from as Address,
          to: to as Address,
          value: BigInt(value),
          data: (data ? data : undefined) as any,
        },
      };
      console.log(
        "Executing EVM Raw Transaction with params:",
        rawTransactionIntentParams
      );
      const jobId = await evmRawTransaction(
        oktoClient,
        rawTransactionIntentParams
      );
      setJobId(jobId);
      showModal("jobId");
      console.log(jobId);
    } catch (error: any) {
      console.error("Error executing EVM Raw Transaction:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
                  <p>
                    If you are unable to see the View Explorer button. You can
                    go to the respective explorer and check the Internal
                    Transaction for your account.
                  </p>
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
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 bg-gray-900 w-full">
      <button
        onClick={() => navigate("/home")}
        className="w-fit py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black mb-8"
      >
        Home
      </button>
      <h1 className="text-white font-bold text-3xl mb-8">
        EVM Raw Transaction
      </h1>
      <p className="text-white font-regular text-lg mb-6">
        For a detailed overview of Raw Transaction intent, refer to our
        documentation on{" "}
        <a
          className="underline text-indigo-300"
          href="https://docs.okto.tech/docs/react-sdk/evmRawTransaction"
          target="_blank"
          rel="noopener noreferrer"
        >
          EVM Raw Transaction
        </a>
        .
      </p>
      <div className="flex flex-col gap-4 w-full max-w-2xl">
        <div className="flex w-full flex-col items-center bg-black p-6 rounded-lg shadow-xl border border-gray-800">
          {/* Network Selection */}
          <div className="w-full my-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select Network
            </label>
            <select
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
              value={selectedChain}
              onChange={handleNetworkChange}
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
          {selectedChain && (
            <p className="mt-2 text-sm text-gray-300 border border-indigo-700 p-2 my-2">
              {sponsorshipEnabled
                ? "Gas sponsorship is available ✅"
                : "⚠️ Sponsorship is not activated for this chain, the user must hold native tokens to proceed with the transfer. You can get the token from the respective faucets"}
            </p>
          )}

          {/* Sender Address Input */}
          <div className="w-full my-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Enter Address
            </label>
            <input
              className="w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Enter Sender Address"
            />
            <p className="mt-2 text-sm text-gray-300 border border-indigo-700 p-2 my-2">
              ⬆️ This is the embedded wallet address associated with the
              currently signed-in user.
            </p>
          </div>

          {/* Recipient Address Input */}
          <div className="w-full my-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Recipient Address
            </label>
            <input
              className="w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Enter Recipient Address"
            />
          </div>

          {/* Amount Input */}
          <div className="w-full my-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Amount
            </label>
            <input
              className="w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter Value in Wei"
            />
          </div>

          {/* Symbol Input */}
          <div className="w-full my-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Data (Optionally '0x')
            </label>
            <input
              className="w-full p-3 mb-4 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Enter Data (optional)"
            />
          </div>

          <div className="flex gap-x-2 w-full">
            <button
              className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-blue-800 disabled:opacity-50"
              onClick={handleEVMRawTransaction}
              disabled={isLoading || !selectedChain || !from || !to || !value}
            >
              {isLoading ? "Processing..." : "Raw Transaction (Direct)"}
            </button>
            <button
              className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:bg-purple-800 disabled:opacity-50"
              onClick={handleCreateUserOp}
              disabled={isLoading || !selectedChain || !from || !to || !value}
            >
              {isLoading ? "Processing..." : "Raw Transaction UserOp"}
            </button>
          </div>
        </div>
      </div>
      {renderModals()}
    </main>
  );
}

export default EVMRawTransaction;
