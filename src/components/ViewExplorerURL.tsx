import React, { useState, useEffect } from "react";
import { getAccount } from "@okto_web3/react-sdk";
import { useOkto } from "@okto_web3/react-sdk";

type OrderHistory = {
  details: {
    caip2id: string;
  };
};

type ViewURLProps = {
  orderHistory?: OrderHistory;
};

const ViewExplorerURL: React.FC<ViewURLProps> = ({ orderHistory }) => {
  const [senderAddress, setSenderAddress] = useState<string | null>(null);
  const oktoClient = useOkto();

  useEffect(() => {
    const fetchAccount = async () => {
      if (!orderHistory) return;
      try {
        const accounts = await getAccount(oktoClient);
        const nativeAccount = accounts.find(
          (account) => account.caipId === orderHistory.details.caip2id
        );
        setSenderAddress(nativeAccount?.address || null);
      } catch (error) {
        console.error("Error fetching account:", error);
      }
    };
    fetchAccount();
  }, [orderHistory, oktoClient]);

  const explorerUrls: Record<string, string> = {
    "eip155:42161": "https://arbiscan.io/address/{address}#tokentxns", // Arbitrum
    "eip155:43114": "https://subnets.avax.network/dexalot/address/{address}", // Avalanche
    "eip155:8453": "https://basescan.org/address/{address}#internaltx", // Base
    "eip155:84532": "https://sepolia.basescan.org/address/{address}#internaltx", // Base_Testnet
    "eip155:56": "https://bscscan.com/address/{address}", // BSC
    "eip155:1": "https://etherscan.io/address/{address}#internaltx", // Ethereum
    "eip155:250": "https://ftmscan.com/address/{address}", // Fantom
    "eip155:998": "https://testnet.purrsec.com/address/{address}", // Hyperliquid EVM Testnet
    "eip155:59144": "https://lineascan.build/address/{address}#tokentxns", // Linea
    "eip155:1088": "https://explorer.metis.io/address/{address}/internalTx", // Metis
    "eip155:10": "https://optimistic.etherscan.io/address/{address}#internaltx", // Optimism
    "eip155:137": "https://polygonscan.com/address/{address}#internaltx", // Polygon
    "eip155:80002": "https://www.oklink.com/amoy/address/{address}/internal", // Polygon Testnet Amoy
    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1":
      "https://explorer.solana.com/address/{address}", // Solana
  };

  if (!senderAddress || !orderHistory?.details?.caip2id) {
    return null;
  }

  const baseUrl = explorerUrls[orderHistory.details.caip2id] || null;
  const finalUrl = baseUrl ? baseUrl.replace("{address}", senderAddress) : "#";

  return (
    <div className="flex justify-center pt-2 w-full">
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors w-full text-center"
      >
        View in Explorer
      </a>
    </div>
  );
};

export default ViewExplorerURL;