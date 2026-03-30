import { useState, useRef, useEffect } from "react";
import { useConnection, abbreviateAddress } from "@evefrontier/dapp-kit";
import { useCurrentAccount, useWallets, useDAppKit } from "@mysten/dapp-kit-react";
import { useBounties } from "./hooks/useBounties";
import { usePlayerCharacter } from "./hooks/usePlayerCharacter";
import { BountyRow } from "./components/BountyRow";
import { CreateBountyModal } from "./components/CreateBountyModal";
import { ClaimsPage } from "./components/ClaimsPage";
import "./styles/global.css";

type SortDir = "desc" | "asc";

export default function App() {
    const { handleDisconnect } = useConnection();
    const dAppKit = useDAppKit();
    const wallets = useWallets();
    const account = useCurrentAccount();
    const { data: character, isLoading: characterLoading } = usePlayerCharacter(account?.address);
    const { data: bounties, isLoading, refetch } = useBounties();
    const [showCreate, setShowCreate] = useState(false);
    const [showWalletPicker, setShowWalletPicker] = useState(false);
    const [page, setPage] = useState<"board" | "claims">("board");
    const [search, setSearch] = useState("");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showWalletPicker) return;
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowWalletPicker(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showWalletPicker]);

    const totalPot = bounties?.reduce((sum, b) => sum + Number(b.pot), 0) ?? 0;
    const totalSui = (totalPot / 1_000_000_000).toFixed(3);

    const filtered = (bounties ?? [])
        .filter(b => {
            if (!search) return true;
            const q = search.toLowerCase();
            return b.tar.toLowerCase().includes(q) || b.info.toLowerCase().includes(q);
        })
        .sort((a, b) => sortDir === "desc"
            ? Number(b.pot) - Number(a.pot)
            : Number(a.pot) - Number(b.pot)
        );

    return (
        <div className="app">
            <div className="scanlines" />

            <header className="header">
                <div className="header-left">
                    <div className="logo">
                        <span className="logo-prefix">EVE //</span>
                        <span className="logo-main">BOUNTY BOARD</span>
                    </div>
                    <div className="header-stats">
                        <span className="stat">
                            <span className="stat-label">ACTIVE</span>
                            <span className="stat-value">{bounties?.length ?? "—"}</span>
                        </span>
                        <span className="stat-divider">|</span>
                        <span className="stat">
                            <span className="stat-label">OUTSTANDING BOUNTIES</span>
                            <span className="stat-value">{totalSui} SUI</span>
                        </span>
                    </div>
                </div>

                <div className="header-right">
                    {account && page === "board" && (
                        <button
                            className="post-btn"
                            onClick={() => setShowCreate(true)}
                        >
                            + POST BOUNTY
                        </button>
                    )}
                    {account && (
                        <>
                            <button
                                className={`tab-btn ${page === "board" ? "active" : ""}`}
                                onClick={() => setPage("board")}
                            >
                                BOARD
                            </button>
                            <button
                                className={`tab-btn ${page === "claims" ? "active" : ""}`}
                                onClick={() => setPage("claims")}
                            >
                                MY CLAIMS
                            </button>
                        </>
                    )}
                    <div className="wallet-wrap" ref={pickerRef}>
                        <button
                            className="wallet-btn"
                            onClick={() => setShowWalletPicker(v => !v)}
                        >
                            {account
                                ? (character?.name ?? abbreviateAddress(account.address))
                                : "CONNECT WALLET"}
                        </button>
                        {showWalletPicker && (
                            <div className="wallet-picker">
                                {account ? (
                                    <>
                                        {characterLoading && (
                                            <div className="wallet-picker-char">RESOLVING CHARACTER...</div>
                                        )}
                                        {!characterLoading && character && (
                                            <div className="wallet-picker-char">{character.name}</div>
                                        )}
                                        {!characterLoading && !character && (
                                            <div className="wallet-picker-char no-char">NO CHARACTER FOUND</div>
                                        )}
                                        <div className="wallet-picker-addr">{account.address}</div>
                                        <button
                                            className="wallet-picker-item"
                                            onClick={() => { navigator.clipboard.writeText(account.address); setShowWalletPicker(false); }}
                                        >
                                            COPY ADDRESS
                                        </button>
                                        <button
                                            className="wallet-picker-item wallet-picker-disconnect"
                                            onClick={() => { handleDisconnect(); setShowWalletPicker(false); }}
                                        >
                                            DISCONNECT
                                        </button>
                                    </>
                                ) : (
                                    [...wallets].sort((a, b) => {
                                        if (a.name.toLowerCase().includes("eve vault")) return -1;
                                        if (b.name.toLowerCase().includes("eve vault")) return 1;
                                        return 0;
                                    }).map(w => (
                                        <button
                                            key={w.name}
                                            className="wallet-picker-item"
                                            onClick={() => {
                                                dAppKit.connectWallet({ wallet: w });
                                                setShowWalletPicker(false);
                                            }}
                                        >
                                            {w.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="main">
                {page === "claims" && account && character ? (
                    <ClaimsPage character={character} />
                ) : page === "claims" && account && !character ? (
                    <div className="state-msg">NO CHARACTER ASSOCIATED WITH THIS WALLET — CANNOT CHECK CLAIMS</div>
                ) : (
                    <>
                        <div className="board-header">
                            <span className="blink">▶</span> ACTIVE CONTRACTS — SECTOR ALL — UPDATED LIVE
                            <input
                                className="search-input"
                                type="text"
                                placeholder="SEARCH TARGET OR INTEL..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {isLoading ? (
                            <div className="state-msg">SCANNING BLOCKCHAIN...</div>
                        ) : !filtered.length ? (
                            <div className="state-msg">
                                {search ? "NO MATCHING BOUNTIES" : "NO ACTIVE BOUNTIES"} — <button className="inline-btn" onClick={() => refetch()}>REFRESH</button>
                            </div>
                        ) : (
                            <table className="bounty-table">
                                <thead>
                                    <tr>
                                        <th className="col-idx">#</th>
                                        <th className="col-target">TARGET</th>
                                        <th className="col-info">INTEL</th>
                                        <th
                                            className="col-pot sortable"
                                            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                                        >
                                            BOUNTY {sortDir === "desc" ? "▼" : "▲"}
                                        </th>
                                        <th className="col-actions"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((bounty, i) => (
                                        <BountyRow key={bounty.id} bounty={bounty} index={i} />
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </main>

            <footer className="footer">
                <span>FRONTIER BOUNTY BOARD v0.1 // BUILT ON SUI</span>
                <button className="inline-btn" onClick={() => refetch()}>⟳ REFRESH</button>
            </footer>

            {showCreate && (
                <CreateBountyModal onClose={() => setShowCreate(false)} />
            )}
        </div>
    );
}
