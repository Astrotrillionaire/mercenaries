import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createDAppKit, DAppKitProvider } from "@mysten/dapp-kit-react";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import {
    VaultProvider,
    SmartObjectProvider,
    NotificationProvider,
} from "@evefrontier/dapp-kit";
import App from "./App";

const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL as string;
if (!SUI_RPC_URL) {
    throw new Error("Missing VITE_SUI_RPC_URL");
}

const network = (import.meta.env.VITE_SUI_NETWORK ?? "localnet") as "testnet" | "localnet";

const dAppKit = createDAppKit({
    networks: [network] as const,
    createClient: () =>
        new SuiJsonRpcClient({ url: SUI_RPC_URL, network }),
    enableBurnerWallet: network === "localnet",
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <DAppKitProvider dAppKit={dAppKit}>
                <VaultProvider>
                    <SmartObjectProvider>
                        <NotificationProvider>
                            <App />
                        </NotificationProvider>
                    </SmartObjectProvider>
                </VaultProvider>
            </DAppKitProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
