import { Router } from "express";
import { db, leadsTable } from "../db";
import { eq, count, desc } from "drizzle-orm";
import {
  SubmitContactBody,
  SubmitQuoteBody,
  SubmitBrochureBody,
  SubmitCallbackBody,
} from "../shared";

const router = Router();

// POST /leads/contact
router.post("/leads/contact", async (req, res) => {
  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, email, phone, company, industry, message } = parsed.data;
  const [lead] = await db
    .insert(leadsTable)
    .values({ type: "contact", name, email, phone, company, industry, message })
    .returning({ id: leadsTable.id });
  res.status(201).json({ success: true, message: "Thank you for contacting us. We will get back to you shortly.", id: lead.id });
});

// POST /leads/quote
router.post("/leads/quote", async (req, res) => {
  const parsed = SubmitQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, email, phone, company, industry, product, quantity, message } = parsed.data;
  const fullMessage = [message, quantity ? `Quantity: ${quantity}` : null].filter(Boolean).join(" | ");
  const [lead] = await db
    .insert(leadsTable)
    .values({ type: "quote", name, email, phone, company, industry, product, message: fullMessage || null })
    .returning({ id: leadsTable.id });
  res.status(201).json({ success: true, message: "Your quote request has been received. Our team will contact you within 24 hours.", id: lead.id });
});

// POST /leads/brochure
router.post("/leads/brochure", async (req, res) => {
  const parsed = SubmitBrochureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, email, phone, company } = parsed.data;
  const [lead] = await db
    .insert(leadsTable)
    .values({ type: "brochure", name, email, phone, company })
    .returning({ id: leadsTable.id });
  res.status(201).json({ success: true, message: "Your brochure is ready. Check your email for the download link.", id: lead.id });
});

// POST /leads/callback
router.post("/leads/callback", async (req, res) => {
  const parsed = SubmitCallbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, phone, email, preferredTime } = parsed.data;
  const [lead] = await db
    .insert(leadsTable)
    .values({ type: "callback", name, email: email ?? "", phone, preferredTime })
    .returning({ id: leadsTable.id });
  res.status(201).json({ success: true, message: "Callback request received. We will call you at your preferred time.", id: lead.id });
});

// GET /leads
router.get("/leads", async (_req, res) => {
  const leads = await db
    .select()
    .from(leadsTable)
    .orderBy(desc(leadsTable.createdAt))
    .limit(100);
  res.json(
    leads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }))
  );
});

// GET /leads/stats
router.get("/leads/stats", async (_req, res) => {
  const [totalRow] = await db.select({ value: count() }).from(leadsTable);
  const [contactsRow] = await db.select({ value: count() }).from(leadsTable).where(eq(leadsTable.type, "contact"));
  const [quotesRow] = await db.select({ value: count() }).from(leadsTable).where(eq(leadsTable.type, "quote"));
  const [brochuresRow] = await db.select({ value: count() }).from(leadsTable).where(eq(leadsTable.type, "brochure"));
  const [callbacksRow] = await db.select({ value: count() }).from(leadsTable).where(eq(leadsTable.type, "callback"));
  const recent = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt)).limit(5);
  res.json({
    total: Number(totalRow.value),
    contacts: Number(contactsRow.value),
    quotes: Number(quotesRow.value),
    brochures: Number(brochuresRow.value),
    callbacks: Number(callbacksRow.value),
    recent: recent.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
  });
});

export default router;
