import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";

const abiRaw = [
  "function isOwnerAddress(address _address) view returns (bool)",
] as const;

const smartWalletAddress = "0x2a6c7BB649234EE2656550e163c8AAAEd7318dCB";
const ownerAddress = "0x8d25687829D6b85d9e0020B8c89e3Ca24dE20a89";

async function main() {
  const abi = parseAbi(abiRaw);
  const client = createPublicClient({
    transport: http(),
    chain: base,
  });

  const isOwner = await client.readContract({
    abi,
    address: smartWalletAddress,
    functionName: "isOwnerAddress",
    args: [ownerAddress],
  });

  console.log(`Is owner: ${isOwner}`);
}

main();
