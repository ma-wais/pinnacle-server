import mongoose, { Schema } from "mongoose";

export type PricingConfigDoc = {
  _id: mongoose.Types.ObjectId;
  baseCopperPrice: number;
  baseAluminumPrice: number;
  baseLeadPrice: number;
  baseZincPrice: number;
  updatedAt: Date;
};

const pricingConfigSchema = new Schema<PricingConfigDoc>(
  {
    baseCopperPrice: { type: Number, required: true, default: 0 },
    baseAluminumPrice: { type: Number, required: true, default: 0 },
    baseLeadPrice: { type: Number, required: true, default: 0 },
    baseZincPrice: { type: Number, required: true, default: 0 },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

export const PricingConfigModel =
  mongoose.models.PricingConfig ||
  mongoose.model<PricingConfigDoc>("PricingConfig", pricingConfigSchema);
