"use client";
import React, { useState, useEffect } from "react";
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";
import moment from "moment";
import {
  truncatedPublicKeyForTransaction,
  truncatedPublicKey,
} from "@/utils/helper";

interface TokenBalance {
  mintAddress: string;
  balance: number;
}

const Transaction = () => {
  const [activeTab, setActiveTab] = useState("tokens");
  const [showTabs, setShowTabs] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionsFetched, setTransactionsFetched] = useState(false);
  const [walletAddress, setWalletAddress] = useState(
    "G2k6ShTNEyJo84Gu6Dey6ubKagaFQzjBxffncNtPJuqR"
  );

  useEffect(() => {
    if (!showTabs) {
      setActiveTab("");
    }
  }, [showTabs]);

  const handleTabClick = (tab: string) => {
    if (showTabs) {
      setActiveTab(tab);
    }
  };

  const fetchWithRetry = async (
    fn: () => Promise<any>,
    retries = 5,
    delay = 3000
  ): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      if (retries <= 0) throw error;

      if (error.status === 429) {
        console.warn("Rate limit exceeded. Retrying after delay...");
        const retryAfter = error.headers.get("Retry-After") || delay;
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        return fetchWithRetry(fn, retries - 1, Math.min(delay * 2, 30000)); // cap max delay to 30 seconds
      }

      throw error;
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      const signatures = await fetchWithRetry(
        () =>
          connection.getConfirmedSignaturesForAddress2(
            new PublicKey(walletAddress)
          ),
        5,
        3000
      );

      const transactions = await Promise.all(
        signatures.map(async (signatureInfo: ConfirmedSignatureInfo) => {
          const transaction = await fetchWithRetry(
            () =>
              connection.getParsedConfirmedTransaction(signatureInfo.signature),
            5,
            3000
          );
          if (transaction) {
            return formatTransaction(transaction);
          }
          return null;
        })
      );

      const filteredTransactions = transactions.filter(
        (transaction) => transaction !== null
      );
      setTransactions(filteredTransactions);
      localStorage.setItem(
        `transactions-${walletAddress}`,
        JSON.stringify(filteredTransactions)
      ); // Save transactions to local storage with wallet-specific key
      setTransactionsFetched(true);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenBalances = async () => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const parsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ), // SPL Token program id
        }
      );

      const tokenBalances = parsedTokenAccounts.value.map((accountInfo) => {
        const accountData = accountInfo.account.data.parsed.info;
        return {
          mintAddress: accountData.mint,
          balance: accountData.tokenAmount.uiAmount,
        };
      });

      setTokenBalances(tokenBalances);
    } catch (error) {
      console.error("Error fetching token balances:", error);
    }
  };

  useEffect(() => {
    const savedTransactions = localStorage.getItem(
      `transactions-${walletAddress}`
    );
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
      setTransactionsFetched(true);
    } else {
      fetchTransactions();
    }
    fetchTokenBalances(); // Fetch token balances when the component mounts or walletAddress changes
  }, [walletAddress]);

  function formatTransaction(transaction: any) {
    const signature = truncatedPublicKeyForTransaction(
      transaction.transaction.signatures[0]
    );
    const block = transaction.slot;
    const timestamp = moment
      .unix(transaction.blockTime)
      .format("MMM DD, YYYY [at] HH:mm:ss [UTC]");
    const age = moment.unix(transaction.blockTime).fromNow();
    const result = transaction.meta.err === null ? "Success" : "Failed";

    return {
      signature,
      block,
      age,
      timestamp,
      result,
    };
  }

  const handleWalletChange = (newWalletAddress: string) => {
    if (newWalletAddress !== walletAddress) {
      setWalletAddress(newWalletAddress);
      setTransactions([]); // Clear current transactions
      setTokenBalances([]); // Clear current token balances
      setTransactionsFetched(false); // Reset fetched state
    }
  };

  return (
    <div className="min-h-screen flex flex-col py-24 container">
      <div className="mb-4">
        <ul
          className="flex flex-wrap -mb-px text-sm font-medium text-center"
          id="default-styled-tab"
          role="tablist"
        >
          <li className="me-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === "tokens"
                  ? "text-yellow-500 border-yellow-500"
                  : " hover:border-green-500 dark:hover:text-green-500  text-slate-600 border-slate-600"
              }`}
              onClick={() => handleTabClick("tokens")}
              type="button"
              role="tab"
              aria-controls="tokens"
              aria-selected={activeTab === "tokens"}
            >
              tokens
            </button>
          </li>
          <li className="me-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === "transactions"
                  ? "text-yellow-500 border-yellow-500"
                  : " hover:border-green-500 dark:hover:text-green-500  text-slate-600 border-slate-600"
              }`}
              onClick={() => handleTabClick("transactions")}
              type="button"
              role="tab"
              aria-controls="transactions"
              aria-selected={activeTab === "transactions"}
            >
              transactions
            </button>
          </li>
        </ul>
      </div>

      {showTabs ? (
        <div id="default-styled-tab-content" className="w-full mt-6">
          {activeTab === "tokens" && (
            <div className="" id="styled-tokens" role="tabpanel">
              <table className="w-full text-sm text-left rtl:text-righttext-gray-400">
                <thead className="text-xs text-gray-700  bg-slate-950 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Mint Address
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Total Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokenBalances.map((token, index) => (
                    <tr key={index} className="bg-slate-900 dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-green-600 whitespace-nowrap">
                        {token.mintAddress}
                      </td>
                      <td className="px-6 py-4">{token.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === "transactions" && (
            <div className=" " id="styled-transactions" role="tabpanel">
              <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                {loading ? (
                  <div className="text-center p-4">
                    <span className="text-blue-500">
                      Loading transactions...
                    </span>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left rtl:text-righttext-gray-400">
                    <thead className="text-xs text-gray-700  bg-slate-950 dark:text-gray-400">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          Transaction Signature
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Block
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Age
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Timestamp
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Result
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, index) => (
                        <tr
                          key={index}
                          className="bg-slate-900 dark:border-gray-700"
                        >
                          <td className="px-6 py-4 font-medium text-green-600 whitespace-nowrap">
                            {tx.signature}
                          </td>
                          <td className="px-6 py-4">{tx.block}</td>
                          <td className="px-6 py-4">{tx.age}</td>
                          <td className="px-6 py-4">{tx.timestamp}</td>
                          <td className="px-6 py-4">{tx.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-4">
          <span className="text-blue-500">No tabs available</span>
        </div>
      )}
    </div>
  );
};

export default Transaction;
