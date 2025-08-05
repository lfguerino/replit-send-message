import { type User, type InsertUser, type WhatsappSession, type InsertWhatsappSession, type Campaign, type InsertCampaign, type Contact, type InsertContact, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // WhatsApp Sessions
  getWhatsappSession(sessionName: string): Promise<WhatsappSession | undefined>;
  createWhatsappSession(session: InsertWhatsappSession): Promise<WhatsappSession>;
  updateWhatsappSession(sessionName: string, updates: Partial<WhatsappSession>): Promise<WhatsappSession | undefined>;
  getAllWhatsappSessions(): Promise<WhatsappSession[]>;

  // Campaigns
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  getAllCampaigns(): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;

  // Contacts
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined>;
  getContactsByCampaign(campaignId: string): Promise<Contact[]>;
  getAllContacts(): Promise<Contact[]>;
  createMultipleContacts(contacts: InsertContact[]): Promise<Contact[]>;
  deleteContact(id: string): Promise<void>;
  deleteContactsByCampaign(campaignId: string): Promise<void>;

  // Campaign Management
  deleteCampaign(id: string): Promise<void>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  clearActivityLogs(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private whatsappSessions: Map<string, WhatsappSession>;
  private campaigns: Map<string, Campaign>;
  private contacts: Map<string, Contact>;
  private activityLogs: ActivityLog[];

  constructor() {
    this.users = new Map();
    this.whatsappSessions = new Map();
    this.campaigns = new Map();
    this.contacts = new Map();
    this.activityLogs = [];
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      isActive: insertUser.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // WhatsApp Sessions
  async getWhatsappSession(sessionName: string): Promise<WhatsappSession | undefined> {
    return Array.from(this.whatsappSessions.values()).find(session => session.sessionName === sessionName);
  }

  async createWhatsappSession(insertSession: InsertWhatsappSession): Promise<WhatsappSession> {
    const id = randomUUID();
    const session: WhatsappSession = {
      ...insertSession,
      id,
      status: insertSession.status || 'disconnected',
      deviceName: insertSession.deviceName || null,
      lastActivity: insertSession.lastActivity || null,
      createdAt: new Date().toISOString(),
    };
    this.whatsappSessions.set(id, session);
    return session;
  }

  async updateWhatsappSession(sessionName: string, updates: Partial<WhatsappSession>): Promise<WhatsappSession | undefined> {
    const session = await this.getWhatsappSession(sessionName);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.whatsappSessions.set(session.id, updatedSession);
    return updatedSession;
  }

  async getAllWhatsappSessions(): Promise<WhatsappSession[]> {
    return Array.from(this.whatsappSessions.values());
  }

  // Campaigns
  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      status: insertCampaign.status || 'draft',
      messageInterval: insertCampaign.messageInterval || 3,
      scheduledAt: insertCampaign.scheduledAt || null,
      totalContacts: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;

    const updatedCampaign = { ...campaign, ...updates, updatedAt: new Date().toISOString() };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(campaign => 
      campaign.status === 'active'
    );
  }

  // Contacts
  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      ...insertContact,
      id,
      status: insertContact.status || 'pending',
      customFields: insertContact.customFields || null,
      sentAt: null,
      deliveredAt: null,
      errorMessage: null,
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;

    const updatedContact = { ...contact, ...updates };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async getContactsByCampaign(campaignId: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(contact => 
      contact.campaignId === campaignId
    );
  }

  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async deleteContact(id: string): Promise<void> {
    this.contacts.delete(id);
  }

  async deleteContactsByCampaign(campaignId: string): Promise<void> {
    for (const [id, contact] of this.contacts.entries()) {
      if (contact.campaignId === campaignId) {
        this.contacts.delete(id);
      }
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    this.campaigns.delete(id);
  }

  async createMultipleContacts(insertContacts: InsertContact[]): Promise<Contact[]> {
    const contacts: Contact[] = [];
    for (const insertContact of insertContacts) {
      const contact = await this.createContact(insertContact);
      contacts.push(contact);
    }
    return contacts;
  }

  // Activity Logs
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = {
      ...insertLog,
      id,
      metadata: insertLog.metadata || null,
      createdAt: new Date().toISOString(),
    };
    this.activityLogs.unshift(log); // Add to beginning for newest first
    
    // Keep only last 1000 logs
    if (this.activityLogs.length > 1000) {
      this.activityLogs = this.activityLogs.slice(0, 1000);
    }
    
    return log;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return this.activityLogs.slice(0, limit);
  }

  async clearActivityLogs(): Promise<void> {
    this.activityLogs = [];
  }
}

import { SQLiteStorage } from "./storage-sqlite.js";

export const storage = new SQLiteStorage();
