// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Environment variables
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);
const STATIC_PATH = process.env.NODE_ENV === "production"
  ? join(process.cwd(), "frontend", "dist")
  : join(process.cwd(), "frontend");

// Initialize Express app
const app = express();
app.use(express.json());

// Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(shopify.config.auth.callbackPath, shopify.auth.callback(), shopify.redirectToShopifyOrAppRoot());
app.post(shopify.config.webhooks.path, shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers }));
app.use("/api/*", shopify.validateAuthenticatedSession());

// Route handlers
const getProducts = async (_req, res) => {
  try {
    const products = await shopify.api.rest.Product.all({
      session: res.locals.shopify.session,
    });
    res.status(200).send(products);
  } catch (error) {
    console.error(`Failed to fetch products: ${error.message}`);
    res.status(500).send({ error: error.message });
  }
};

const generateDescription = async (_req, res) => {
  const { selectedResources } = _req.body;
  if (!selectedResources) {
    return res.status(400).send({ success: false, message: "No resources selected" });
  }

  try {
    const productId = selectedResources[0];
    const product = await shopify.api.rest.Product.find({
      session: res.locals.shopify.session,
      id: productId,
    });

    if (!product) {
      return res.status(400).send({ success: false, message: "Product not found" });
    }

    const prompt = `Generate a good description for the product ${product.title}, ${product.body_html}, ${product.product_type}, ${product.handle}, ${product.tags}`;
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o-mini",
    });

    const description = completion.choices[0]?.message.content;
    res.status(200).send({ success: true, description });
  } catch (error) {
    console.error(`Error generating description: ${error.message}`);
    res.status(500).send({ success: false, error: error.message });
  }
};

const updateProductDescription = async (_req, res) => {
  const { description, productId } = _req.body;
  if (!description) {
    return res.status(400).send({ success: false, message: "Description is required" });
  }

  try {
    const product = new shopify.api.rest.Product({ session: res.locals.shopify.session });
    product.id = productId;
    product.body_html = description;
    await product.save({ update: true });

    res.status(200).send({ success: true, data: product });
  } catch (error) {
    console.error(`Error updating product description: ${error.message}`);
    res.status(500).send({ success: false, error: error.message });
  }
};



// API routes
app.get("/api/products", getProducts);
app.post("/api/generate", generateDescription);
app.post("/api/update", updateProductDescription);

// Static file serving and fallback
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));
app.use("/*", shopify.ensureInstalledOnShop(), (_req, res) => {
  res.status(200).set("Content-Type", "text/html").send(readFileSync(join(STATIC_PATH, "index.html")));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
