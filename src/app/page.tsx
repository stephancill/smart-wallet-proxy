"use client";

import { useQuery } from "@tanstack/react-query";
import { Client, isAddress, parseAbi } from "viem";
import { readContract } from "viem/actions";
import {
  useAccount,
  useClient,
  useConnect,
  useDisconnect,
  useWriteContract,
} from "wagmi";

const abi = parseAbi([
  "function isOwnerAddress(address _address) view returns (bool)",
  "function ownerCount() view returns (uint256)",
  "function ownerAtIndex(uint256 _index) view returns (bytes)",
  "function addOwnerAddress(address _address)",
  "function removeOwnerAtIndex(uint256 _index, bytes _owner)",
] as const);

async function getOwners(address: `0x${string}` | undefined, client: Client) {
  if (!address) {
    return null;
  }

  const ownerCount = await readContract(client, {
    abi,
    address,
    functionName: "ownerCount",
  });

  const owners = await Promise.all(
    Array.from({ length: Number(ownerCount) }, (_, i) =>
      readContract(client, {
        abi,
        address,
        functionName: "ownerAtIndex",
        args: [BigInt(i)],
      })
    )
  );

  return owners;
}

function App() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = useClient();
  const {
    data: owners,
    isLoading: isOwnersLoading,
    error: ownersError,
  } = useQuery({
    queryKey: ["owners", account.address],
    queryFn: () => getOwners(account.address, publicClient),
    enabled: !!account.address,
    refetchOnWindowFocus: false,
  });

  const {
    data: addOwnerHash,
    isPending: isAddOwnerPending,
    writeContract: writeAddOwner,
  } = useWriteContract();

  const {
    data: removeOwnerHash,
    isPending: isRemoveOwnerPending,
    writeContract: writeRemoveOwner,
  } = useWriteContract();

  async function addOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const ownerAddress = formData.get("ownerAddress") as string;

    if (!isAddress(ownerAddress)) {
      alert("Invalid address");
      return;
    }

    if (!account.address) {
      alert("Connect your wallet first");
      return;
    }

    writeAddOwner({
      abi,
      address: account.address,
      functionName: "addOwnerAddress",
      args: [ownerAddress],
    });
  }

  async function removeOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const ownerIndex = Number(formData.get("ownerIndex"));
    if (isNaN(ownerIndex) || !owners?.[ownerIndex]) {
      alert("Invalid owner index");
      return;
    }
    if (!account.address) {
      alert("Connect your wallet first");
      return;
    }

    const ownerToRemove = owners[ownerIndex];

    if (!prompt(`Are you sure you want to remove ${ownerToRemove}?`)) {
      return;
    }

    writeRemoveOwner({
      abi,
      address: account.address,
      functionName: "removeOwnerAtIndex",
      args: [BigInt(ownerIndex), ownerToRemove],
    });
  }

  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === "connected" && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>

      <div>
        <h2>Owners</h2>
        {isOwnersLoading ? (
          <div>Loading...</div>
        ) : ownersError ? (
          <div>
            Error: {error?.message} {error?.stack}
          </div>
        ) : (
          owners && <pre>{JSON.stringify(owners, null, 2)}</pre>
        )}
      </div>

      {account.address && owners && (
        <div>
          <div>
            <h2>Add owner address</h2>
            <form onSubmit={addOwner}>
              <input name="ownerAddress" placeholder="0x..." required />
              <button
                disabled={!account.address || isAddOwnerPending}
                type="submit"
              >
                Add owner
              </button>
            </form>
            {isAddOwnerPending && <div>Adding owner...</div>}
            {addOwnerHash && (
              <a target="_blank" href={`https://basescan.com/tx/${addOwner}`}>
                Transaction Hash: {addOwnerHash}
              </a>
            )}
          </div>

          <div>
            <h2>Remove owner</h2>
            <select>
              {owners &&
                owners.map((owner, index) => (
                  <option key={index} value={index}>
                    {owner}
                  </option>
                ))}
            </select>
            <button
              disabled={!account.address || isRemoveOwnerPending}
              type="submit"
            >
              Remove owner
            </button>
            {isRemoveOwnerPending && <div>Removing owner...</div>}
            {removeOwnerHash && (
              <a
                target="_blank"
                href={`https://basescan.com/tx/${removeOwner}`}
              >
                Transaction Hash: {removeOwnerHash}
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
