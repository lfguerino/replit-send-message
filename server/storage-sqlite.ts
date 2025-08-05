import { eq, or } from 'drizzle-orm';
import { db, initializeDatabase } from './db.js';
import * as schema from '../shared/schema.js';
import type { IStorage } from './storage.js';

export class SQLiteStorage implements IStorage {
  constructor() {
    initializeDatabase();
  }

  // WhatsApp Sessions
  async createWhatsappSession(sessionData: any) {
    const id = crypto.randomUUID();
    const session = {
      id,
      ...sessionData,
      createdAt: new Date().toISOString(),
    };
    
    await db.insert(schema.whatsappSessions).values(session);
    return session;
  }

  async getWhatsappSession(sessionName: string) {
    const result = await db.select()
      .from(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.sessionName, sessionName))
      .limit(1);
    
    return result[0] || null;
  }

  async updateWhatsappSession(sessionName: string, updates: any) {
    await db.update(schema.whatsappSessions)
      .set(updates)
      .where(eq(schema.whatsappSessions.sessionName, sessionName));
    
    // Return updated session
    return await this.getWhatsappSession(sessionName);
  }

  // Campaigns
  async createCampaign(campaignData: any) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const campaign = {
      id,
      ...campaignData,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(schema.campaigns).values(campaign);
    return campaign;
  }

  async getCampaign(id: string) {
    const result = await db.select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async getAllCampaigns() {
    return await db.select().from(schema.campaigns);
  }

  async getActiveCampaigns() {
    // Include draft campaigns as well since they are "active" in the sense of being available to work with
    return await db.select().from(schema.campaigns);
  }

  async updateCampaign(id: string, updates: any) {
    await db.update(schema.campaigns)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(schema.campaigns.id, id));
    
    // Return updated campaign
    return await this.getCampaign(id);
  }

  async deleteCampaign(id: string) {
    await db.delete(schema.campaigns)
      .where(eq(schema.campaigns.id, id));
  }

  // Contacts
  async createContact(contactData: any) {
    const id = crypto.randomUUID();
    const contact = {
      id,
      ...contactData,
      customFields: contactData.customFields ? JSON.stringify(contactData.customFields) : null,
    };
    
    await db.insert(schema.contacts).values(contact);
    return { ...contact, customFields: contactData.customFields };
  }

  async createMultipleContacts(contactsData: any[]) {
    const contacts = contactsData.map(contactData => ({
      id: crypto.randomUUID(),
      ...contactData,
      customFields: contactData.customFields ? JSON.stringify(contactData.customFields) : null,
    }));
    
    await db.insert(schema.contacts).values(contacts);
    return contacts.map((contact, index) => ({
      ...contact,
      customFields: contactsData[index].customFields,
    }));
  }

  async getContact(id: string) {
    const result = await db.select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, id))
      .limit(1);
    
    if (!result[0]) return null;
    
    const contact = result[0];
    return {
      ...contact,
      customFields: contact.customFields ? JSON.parse(contact.customFields) : null,
    };
  }

  async getContactsByCampaign(campaignId: string) {
    const results = await db.select()
      .from(schema.contacts)
      .where(eq(schema.contacts.campaignId, campaignId));
    
    return results.map(contact => ({
      ...contact,
      customFields: contact.customFields ? JSON.parse(contact.customFields) : null,
    }));
  }

  async updateContact(id: string, updates: any) {
    const updateData = { ...updates };
    if (updateData.customFields) {
      updateData.customFields = JSON.stringify(updateData.customFields);
    }
    
    await db.update(schema.contacts)
      .set(updateData)
      .where(eq(schema.contacts.id, id));
    
    // Return updated contact
    return await this.getContact(id);
  }

  async deleteContact(id: string) {
    await db.delete(schema.contacts)
      .where(eq(schema.contacts.id, id));
  }

  // Activity Logs
  async createActivityLog(logData: any) {
    const id = crypto.randomUUID();
    const log = {
      id,
      ...logData,
      metadata: typeof logData.metadata === 'string' ? logData.metadata : JSON.stringify(logData.metadata),
      createdAt: new Date().toISOString(),
    };
    
    await db.insert(schema.activityLogs).values(log);
    return { ...log, metadata: typeof logData.metadata === 'string' ? JSON.parse(logData.metadata) : logData.metadata };
  }

  async getActivityLogs(limit = 50) {
    const results = await db.select()
      .from(schema.activityLogs)
      .limit(limit);
    
    return results.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  }

  async clearActivityLogs(): Promise<void> {
    await db.delete(schema.activityLogs);
  }

  async getAllWhatsappSessions() {
    return await db.select().from(schema.whatsappSessions);
  }

  async deleteCampaign(id: string): Promise<void> {
    await db.delete(schema.campaigns)
      .where(eq(schema.campaigns.id, id));
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(schema.contacts)
      .where(eq(schema.contacts.id, id));
  }
}