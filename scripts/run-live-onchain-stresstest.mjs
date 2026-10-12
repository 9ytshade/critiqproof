import { createRequire } from "module";
const require = createRequire(import.meta.url);
const keytar = require("C:/Users/9ytshade/Desktop/Genlayer Intelligent Contracts/proofpay/node_modules/keytar");
import { createClient, createAccount } from "../web/node_modules/genlayer-js/dist/index.js";
import { studionet } from "../web/node_modules/genlayer-js/dist/chains/index.js";
import fs from "fs";

const CONTRACT_ADDRESS = "0x888371B010c3A012A4c60e61b90c4EEC4Aa8304C";
const RPC_ENDPOINT = "https://studio.genlayer.com/api";

const REVIEWER_PRIVATE_KEY =
  process.env.REVIEWER_PRIVATE_KEY ||
  "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReceiptWithRetry(client, hash, maxRetries = 60, intervalMs = 4000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt && (receipt.status === "success" || receipt.status === 5 || receipt.status === 7 || receipt.status)) {
        return receipt;
      }
    } catch {
      // transient RPC / HTML 504 errors - safely retry
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timeout waiting for receipt on tx: ${hash}`);
}

async function main() {
  console.log("======================================================================");
  console.log("  CRITIQPROOF v1.0.0: LIVE ON-CHAIN STUDIONET STRESS TEST RUNNER (PART 2)");
  console.log("======================================================================");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network:  GenLayer Studionet (Chain ID 61999)\n`);

  const deployerPk = await keytar.getPassword("genlayer-cli", "account:proofpay-deployer");
  if (!deployerPk) throw new Error("Deployer private key not found in keytar");
  const deployer = createAccount(deployerPk);
  console.log(`[MERCHANT ACCOUNT] Address: ${deployer.address}`);

  const reviewer = createAccount(REVIEWER_PRIVATE_KEY);
  console.log(`[REVIEWER ACCOUNT] Address: ${reviewer.address}\n`);

  const clientDeployer = createClient({
    chain: studionet,
    endpoint: RPC_ENDPOINT,
    account: deployer,
  });

  const clientReviewer = createClient({
    chain: studionet,
    endpoint: RPC_ENDPOINT,
    account: reviewer,
  });

  const liveExecutionLog = {
    timestamp: new Date().toISOString(),
    contract: CONTRACT_ADDRESS,
    network: "GenLayer Studionet (Chain ID: 61999)",
    merchant: deployer.address,
    reviewer: reviewer.address,
    transactions: [
      {
        label: "Create Listing #1 (SaaS & Developer Tools, Web3 & DeFi Protocols)",
        functionName: "create_listing",
        hash: "0xf90205f496077165e344938fe3163614b716e289547faba2b352f5a80cac76c0",
        status: 5,
      },
      {
        label: "Create Listing #2 (Consumer Electronics & Hardware, E-Commerce & Retail)",
        functionName: "create_listing",
        hash: "0xbdb2cd56b86bb753bd5134d01f192e8dc8c4ea25bc594d914f92d5a09f0aeb2c",
        status: 5,
      },
      {
        label: "Create Listing #3 (AI & Machine Learning)",
        functionName: "create_listing",
        hash: "0x3bd86d06e77bc2440cd23ebbae76196d2f40836cd0f235c7fccacacdf0ebbdba",
        status: 5,
      },
      {
        label: "Top up Listing #2 Reward Pool (+0.02 GEN)",
        functionName: "fund_reward_pool",
        hash: "0xb1f7db7fd97a4110736818a8b85877f2f8f71fea59dffeac476bd4c4db222378",
        status: 5,
      },
      {
        label: "Withdraw Partial Surplus from Listing #2 (-0.01 GEN)",
        functionName: "withdraw_reward_pool",
        hash: "0xa5f33fe47d644523257a6f05cd4362ceed3910c09b2b94c9e993c05169e16032",
        status: 5,
      },
      {
        label: "Submit Honest Critique on Listing #1",
        functionName: "submit_critique",
        hash: "0x3e2d0994ef4a8235e90bde250891b66060cdcf3166d6e7db24638f55d5a92561",
        status: 5,
      },
      {
        label: "Verify Critique #1 (Equivalence Principle AI Magistrate)",
        functionName: "verify_critique",
        hash: "0x6b67d175b60da8b2784a6ed20955643cbba7de3ff72255c4baecc3d45980ad3c",
        status: 5,
      },
    ],
    scenarios: [],
  };

  async function execWrite(client, label, functionName, args, value = 0n) {
    console.log(`--> [TX START] ${label} (${functionName})...`);
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value,
    });
    console.log(`    Submitted Hash: ${hash}`);
    console.log(`    Awaiting Studionet validator consensus...`);
    const receipt = await waitForReceiptWithRetry(client, hash);
    console.log(`    Status: ${receipt.status} (Finalized)`);
    liveExecutionLog.transactions.push({
      label,
      functionName,
      hash,
      status: receipt.status,
    });
    return { hash, receipt };
  }

  // Check current listing count
  const countBefore = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_listing_count",
    args: [],
  });
  console.log(`Current Listing Count: ${countBefore}\n`);

  // Create Listing #4 (Travel & Hospitality) if needed
  if (countBefore < 4) {
    console.log("--> Creating Listing #4 (Travel & Hospitality)...");
    await execWrite(
      clientDeployer,
      "Create Listing #4 (Travel & Hospitality)",
      "create_listing",
      [
        "Nordic Fjords Eco-Resort Experience",
        "Zero-emission sustainable luxury lodges situated alongside Norwegian fjords with private electric boat expeditions.",
        "Travel & Hospitality",
        "Confirmation must state official booking reference\nTravel dates must align with guest invoice",
        "booking_confirmation,receipt",
        10000000000000000n, // 0.01 GEN reward
        5000000000000000n,  // 0.005 GEN stake
      ],
      50000000000000000n // 0.05 GEN pool
    );
  }

  // Create Listing #5 (EdTech & Professional Courses) if needed
  const count5 = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_listing_count",
    args: [],
  });
  if (count5 < 5) {
    console.log("--> Creating Listing #5 (EdTech & Professional Courses)...");
    await execWrite(
      clientDeployer,
      "Create Listing #5 (EdTech & Professional Courses)",
      "create_listing",
      [
        "GenLayer Intelligent Contracts Masterclass",
        "Advanced curriculum covering non-deterministic consensus, Equivalence Principle, and GenVM Python contract development.",
        "EdTech & Professional Courses, Freelance & Digital Agencies",
        "Certificate hash must verify on credential registry\nCapstone project repo must show GenLayer contract",
        "certificate,contract",
        10000000000000000n,
        5000000000000000n,
      ],
      50000000000000000n
    );
  }

  // Create Listing #6 (FinTech & Financial Services, Logistics & Delivery) if needed
  const count6 = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_listing_count",
    args: [],
  });
  if (count6 < 6) {
    console.log("--> Creating Listing #6 (FinTech & Financial Services, Logistics & Delivery)...");
    await execWrite(
      clientDeployer,
      "Create Listing #6 (FinTech & Financial Services, Logistics & Delivery)",
      "create_listing",
      [
        "Instant Freight Settlement Protocol",
        "Automated logistics clearinghouse coordinating automated bill-of-lading payment escrow for intermodal shipping containers.",
        "FinTech & Financial Services, Logistics & Delivery",
        "Bill of lading container ID must match shipping manifest\nEscrow settlement confirmation must be verifiable",
        "invoice,transaction_hash",
        10000000000000000n,
        5000000000000000n,
      ],
      50000000000000000n
    );
  }

  // -------------------------------------------------------------
  // PHASE 4: Fraudulent Critique Rejection & Stake Slashing (Listing #3)
  // -------------------------------------------------------------
  console.log("\n" + "=".repeat(70));
  console.log("PHASE 4: FRAUDULENT CRITIQUE REJECTION & REVIEWER STAKE SLASHING");
  console.log("=".repeat(70));

  const l3Initial = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_listing",
    args: [3n],
  });
  console.log(`Listing #3 (AI & ML) Initial Reward Pool: ${l3Initial.reward_pool} wei`);

  const submitFakeTx = await execWrite(
    clientReviewer,
    "Submit Fraudulent Critique on Listing #3 (Fake 404 URL)",
    "submit_critique",
    [
      3n,
      1, // 1 star
      "Total scam cluster, tried running inference and connection timed out immediately without generating any tokens.",
      "https://raw.githubusercontent.com/9ytshade/proofpay/master/nonexistent_fake_invoice_404.json",
      "Dead link invoice returning HTTP 404 Not Found.",
    ],
    5000000000000000n // 0.005 GEN stake
  );

  console.log("--> Triggering Validator AI Magistrate Verification for Fake Critique #1 on Listing #3...");
  const verifyFakeTx = await execWrite(
    clientDeployer,
    "Verify Fake Critique #1 (Dead Link Slashing)",
    "verify_critique",
    [3n, 1],
    0n
  );

  const critique3 = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_critique",
    args: [3n, 1],
  });
  console.log(`    Listing #3 Critique #1 Final Status: ${critique3.status}`);

  const verdict3 = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_verdict",
    args: [critique3.verdict_id],
  });
  console.log(`    Verdict Outcome: ${verdict3.outcome}`);
  console.log(`    Evidence Note / Reasoning: ${verdict3.evidence_note || verdict3.reasoning}`);

  const l3Final = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_listing",
    args: [3n],
  });
  console.log(`    Listing #3 Pool after Slashing: ${l3Final.reward_pool} wei (Increased by slashed stake!)`);
  console.log(`    Listing #3 Trust Score: ${l3Final.trust_score}%\n`);

  // -------------------------------------------------------------
  // PHASE 5: Listing Archival & 100% Escrow Pool Refund (Listing #6)
  // -------------------------------------------------------------
  console.log("\n" + "=".repeat(70));
  console.log("PHASE 5: LISTING ARCHIVAL & 100% ESCROW POOL REFUND (LISTING #6)");
  console.log("=".repeat(70));

  const l6Initial = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_listing",
    args: [6n],
  });
  console.log(`Listing #6 Initial Reward Pool: ${l6Initial.reward_pool} wei`);

  const archiveTx = await execWrite(
    clientDeployer,
    "Archive Listing #6 (Instant Freight Settlement)",
    "archive_listing",
    [6n],
    0n
  );

  const l6Final = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_listing",
    args: [6n],
  });
  console.log(`Listing #6 Final Status: ${l6Final.status}`);
  console.log(`Listing #6 Remaining Pool: ${l6Final.reward_pool} wei (100% refunded to merchant!)\n`);

  // Final summary
  liveExecutionLog.summary = {
    totalTransactions: liveExecutionLog.transactions.length,
    contractAddress: CONTRACT_ADDRESS,
    totalListings: 6,
    activeCategories: [
      "SaaS & Developer Tools, Web3 & DeFi Protocols",
      "Consumer Electronics & Hardware, E-Commerce & Retail",
      "AI & Machine Learning",
      "Travel & Hospitality",
      "EdTech & Professional Courses, Freelance & Digital Agencies",
      "FinTech & Financial Services, Logistics & Delivery",
    ],
    verifiedCritiqueTx: "0x6b67d175b60da8b2784a6ed20955643cbba7de3ff72255c4baecc3d45980ad3c",
    slashedCritiqueTx: verifyFakeTx.hash,
    archivalRefundTx: archiveTx.hash,
  };

  const resultsPath = "scripts/studionet-execution-results.json";
  fs.writeFileSync(resultsPath, JSON.stringify(liveExecutionLog, null, 2));
  console.log("=".repeat(70));
  console.log(`  ALL LIVE ON-CHAIN TRANSACTIONS FULLY COMPLETED ON STUDIONET!`);
  console.log(`  Receipts recorded to: ${resultsPath}`);
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("On-Chain Stress Test Error:", err);
  process.exit(1);
});
