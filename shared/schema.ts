import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").$default(() => new Date().toISOString()),
  updatedAt: text("updated_at").$default(() => new Date().toISOString()),
});

export const whatsappSessions = sqliteTable("whatsapp_sessions", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  sessionName: text("session_name").notNull().unique(),
  status: text("status").notNull().default("disconnected"), // connected, disconnected, connecting
  deviceName: text("device_name"),
  lastActivity: text("last_activity"), // ISO string
  createdAt: text("created_at").$default(() => new Date().toISOString()),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  name: text("name").notNull(),
  message: text("message").notNull(),
  messageBlocks: text("message_blocks"), // JSON array of message blocks
  showTyping: integer("show_typing", { mode: 'boolean' }).default(true), // Show typing indicator
  status: text("status").notNull().default("draft"), // draft, active, paused, completed, stopped
  messageInterval: integer("message_interval").notNull().default(5), // seconds
  scheduleType: text("schedule_type").notNull().default("now"), // now, schedule
  scheduledAt: text("scheduled_at"), // ISO string
  totalContacts: integer("total_contacts").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: text("created_at").$default(() => new Date().toISOString()),
  updatedAt: text("updated_at").$default(() => new Date().toISOString()),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  campaignId: text("campaign_id").references(() => campaigns.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  customFields: text("custom_fields"), // JSON string for template variables like {empresa}
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  sentAt: text("sent_at"), // ISO string
  deliveredAt: text("delivered_at"), // ISO string
  errorMessage: text("error_message"),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  type: text("type").notNull(), // message_sent, message_delivered, message_failed, campaign_started, etc.
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at").$default(() => new Date().toISOString()),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappSessionSchema = createInsertSchema(whatsappSessions).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalContacts: true,
  sentCount: true,
  deliveredCount: true,
  failedCount: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  sentAt: true,
  deliveredAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
