
// Web3 dApp для KOGE (KOGE → USDT) з таймером на BNB Chain
import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchNetwork, usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { parseUnits, encodeFunctionData } from 'viem';

const KOGE_TOKEN = '0xe6df05ce8c8301223373cf5b969afcb1498c5528';
const USDT_TOKEN = '0x55d398326f99059fF775485246999027B3197955';
const ROUTER = '0x10ed43c718714eb63d5aa57b78b54704e256024e';

const App = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState('0.01');
  const [countdown, setCountdown] = useState(30);
  const [swapReady, setSwapReady] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSwapReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { config: approveConfig } = usePrepareContractWrite({
    address: KOGE_TOKEN,
    abi: ["function approve(address spender, uint256 amount) external returns (bool)"],
    functionName: 'approve',
    args: [ROUTER, parseUnits(amount, 18)]
  });

  const { data: approveTx, write: approve } = useContractWrite(approveConfig);
  const { isLoading: approving, isSuccess: approved } = useWaitForTransaction({
    hash: approveTx?.hash,
  });

  const { config: swapConfig } = usePrepareContractWrite({
    address: ROUTER,
    abi: [
      "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external"
    ],
    functionName: 'swapExactTokensForTokens',
    args: [
      parseUnits(amount, 18),
      0,
      [KOGE_TOKEN, USDT_TOKEN],
      address,
      Math.floor(Date.now() / 1000) + 60 * 10
    ],
    enabled: swapReady && isConnected
  });

  const { data: swapTx, write: swap } = useContractWrite(swapConfig);
  const { isLoading: swapping, isSuccess: swapped } = useWaitForTransaction({
    hash: swapTx?.hash,
  });

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">KOGE → USDT (BNB Chain)</h1>
      {!isConnected ? (
        <>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              className="px-4 py-2 bg-yellow-400 rounded mb-2"
            >
              Підключити {connector.name}
            </button>
          ))}
        </>
      ) : (
        <>
          <p className="mb-2">Підключено: {address}</p>
          <button onClick={disconnect} className="mb-4 text-red-500 underline">Відключити</button>

          <div className="mb-4">
            <label>Сума KOGE для обміну:</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border p-2 w-full"
            />
          </div>

          <button onClick={() => approve?.()} disabled={!approve} className="px-4 py-2 bg-green-500 text-white rounded">
            Дати дозвіл (Approve)
          </button>
          {approving && <p className="text-blue-500 mt-2">Очікуємо approve транзакцію...</p>}
          {approved && <p className="text-green-500 mt-2">Approve успішний ✅</p>}

          <div className="mt-6">
            <p className="text-lg">Таймер до swap: {countdown} сек.</p>
            <button
              onClick={() => swap?.()}
              disabled={!swapReady || !swap}
              className="px-4 py-2 bg-blue-600 text-white rounded mt-2"
            >
              Swap KOGE → USDT
            </button>
            {swapping && <p className="text-blue-500 mt-2">Своп виконується...</p>}
            {swapped && <p className="text-green-500 mt-2">Swap успішний ✅</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default function RootApp() {
  const { chains, publicClient } = configureChains([bsc], [publicProvider()]);

  const config = createConfig({
    autoConnect: true,
    connectors: [
      new WalletConnectConnector({
        chains,
        options: {
          projectId: 'binance-dapp-stas',
          showQrModal: true,
        },
      }),
      new InjectedConnector({ chains }),
    ],
    publicClient,
  });

  return (
    <WagmiConfig config={config}>
      <App />
    </WagmiConfig>
  );
}
