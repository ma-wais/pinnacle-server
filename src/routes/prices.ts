import { Router } from "express";

const router = Router();

router.get("/copper", async (_req, res) => {
  // In a real app, you would fetch from an API like LME or similar.
  // For this project, we provide a realistic market-rate simulation.
  const basePrice = 6840.5; // GBP per tonne approx
  const fluctuation = (Math.random() - 0.5) * 50;
  const currentPrice = (basePrice + fluctuation).toFixed(2);

  return res.json({
    commodity: "Copper (LME Grade A)",
    price: parseFloat(currentPrice),
    currency: "GBP",
    unit: "per Tonne",
    lastUpdated: new Date().toISOString(),
    source: "Market Simulation Feed",
    status: "Live",
  });
});

export default router;
