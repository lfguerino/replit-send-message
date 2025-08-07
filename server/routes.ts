import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { whatsappService } from "./services/whatsapp";
import { ExcelService } from "./services/excel";
import { insertCampaignSchema, insertContactSchema, insertActivityLogSchema, insertUserSchema, insertWebhookLogSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import bcrypt from "bcryptjs";
import { requireAuth, attachUser, type AuthRequest } from "./middleware/auth";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Attach user to all requests
  app.use(attachUser);

  // Authentication routes
  app.post("/api/auth/login", async (req: AuthRequest, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Usuário ou senha incorretos" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Usuário ou senha incorretos" });
      }

      req.session.userId = user.id;
      res.json({ message: "Login realizado com sucesso" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });



  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", (req: AuthRequest, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Update user profile
  app.put("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { username, email } = req.body;
      const userId = req.session.userId!;

      // Check if username is already taken by another user
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Nome de usuário já está em uso" });
        }
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Update user information
      const updatedUser = await storage.updateUser(userId, {
        username: username || user.username,
        email: email || user.email,
      });

      res.json({ 
        message: "Perfil atualizado com sucesso",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          isActive: updatedUser.isActive
        }
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Update user password
  app.put("/api/auth/password", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId!;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Senha atual incorreta" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(userId, {
        password: hashedNewPassword,
      });

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Setup WhatsApp service event listeners
  whatsappService.on('connected', (data) => {
    storage.updateWhatsappSession(data.sessionName, { 
      status: 'connected',
      lastActivity: new Date().toISOString() 
    });
    broadcast({ type: 'whatsapp_connected', data });
    storage.createActivityLog({
      type: 'connection',
      message: 'WhatsApp conectado com sucesso',
      metadata: data
    });
  });

  whatsappService.on('disconnected', (data) => {
    storage.updateWhatsappSession(data.sessionName, { 
      status: 'disconnected' 
    });
    broadcast({ type: 'whatsapp_disconnected', data });
    storage.createActivityLog({
      type: 'connection',
      message: 'WhatsApp desconectado',
      metadata: data
    });
  });

  whatsappService.on('qrcode', (data) => {
    broadcast({ type: 'qrcode', data });
  });

  whatsappService.on('messageSent', async (data) => {
    broadcast({ type: 'message_sent', data });
    
    // Get contact name from the phone number
    const phoneNumber = data.to;
    const contacts = await storage.getAllContacts();
    const contact = contacts.find(c => c.phone === phoneNumber);
    const contactName = contact ? contact.name : 'Contato';
    
    // Clean phone number (remove @c.us)
    const cleanNumber = data.formattedNumber?.replace('@c.us', '') || phoneNumber;
    
    await storage.createActivityLog({
      type: 'message_sent',
      message: `Mensagem enviada para ${contactName} (${cleanNumber})`,
      metadata: data
    });
  });

  whatsappService.on('messageError', async (data) => {
    broadcast({ type: 'message_error', data });
    
    // Get contact name from the phone number
    const phoneNumber = data.to;
    const contacts = await storage.getAllContacts();
    const contact = contacts.find(c => c.phone === phoneNumber);
    const contactName = contact ? contact.name : 'Contato';
    
    // Clean phone number (remove @c.us)
    const cleanNumber = phoneNumber.replace('@c.us', '');
    
    await storage.createActivityLog({
      type: 'message_failed',
      message: `Erro ao enviar mensagem para ${contactName} (${cleanNumber}): ${data.error}`,
      metadata: data
    });
  });

  // Create default user if none exists
  async function createDefaultUser() {
    try {
      const existingUser = await storage.getUserByUsername("admin");
      if (!existingUser) {
        // Senha forte: CampaignManager2024Pro (sem caracteres especiais, mas forte)
        const hashedPassword = await bcrypt.hash("CampaignManager2024Pro", 10);
        await storage.createUser({
          username: "admin",
          password: hashedPassword,
          email: "admin@whatsapp-campaign.com",
          isActive: true,
        });
        console.log("Default user created: admin/CampaignManager2024Pro");
      }
    } catch (error) {
      console.error("Error creating default user:", error);
    }
  }

  // Create default user on startup
  await createDefaultUser();

  // WhatsApp Connection Routes (Protected)
  app.get("/api/whatsapp/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const status = await whatsappService.getStatus();
      const session = await storage.getWhatsappSession('session_001');
      
      res.json({
        ...status,
        session: session || null
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/whatsapp/connect", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (whatsappService.isConnected()) {
        return res.status(400).json({ message: "WhatsApp já está conectado" });
      }

      // Create or update session record
      let session = await storage.getWhatsappSession('session_001');
      if (!session) {
        session = await storage.createWhatsappSession({
          sessionName: 'session_001',
          status: 'connecting'
        });
      } else {
        session = await storage.updateWhatsappSession('session_001', {
          status: 'connecting'
        }) || session;
      }

      // Start connection process
      whatsappService.connect();

      res.json({ message: "Processo de conexão iniciado", session });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/whatsapp/disconnect", requireAuth, async (req: AuthRequest, res) => {
    try {
      await whatsappService.disconnect();
      await storage.updateWhatsappSession('session_001', {
        status: 'disconnected'
      });

      res.json({ message: "WhatsApp desconectado com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Campaign Routes (Protected)
  app.get("/api/campaigns", requireAuth, async (req: AuthRequest, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/campaigns/active", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Get all campaigns (including drafts) to display in the dashboard
      const campaigns = await storage.getAllCampaigns();
      const campaignsWithProgress = await Promise.all(
        campaigns.map(async (campaign) => {
          const contacts = await storage.getContactsByCampaign(campaign.id);
          return {
            ...campaign,
            contacts: contacts.length,
            progress: contacts.length > 0 ? (campaign.sentCount / contacts.length) * 100 : 0
          };
        })
      );
      res.json(campaignsWithProgress);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all contacts with campaign information (Protected)
  app.get("/api/contacts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      const allContacts = [];
      
      for (const campaign of campaigns) {
        const contacts = await storage.getContactsByCampaign(campaign.id);
        const contactsWithCampaign = contacts.map(contact => ({
          ...contact,
          campaignName: campaign.name,
          campaignStatus: campaign.status
        }));
        allContacts.push(...contactsWithCampaign);
      }
      res.json(allContacts);
    } catch (error: any) {
      console.error("Error getting contacts:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/campaigns", requireAuth, upload.single('contactsFile'), async (req: AuthRequest, res) => {
    try {
      // Convert messageInterval to number and showTyping to boolean before validation
      const processedBody = {
        ...req.body,
        messageInterval: parseInt(req.body.messageInterval) || 5,
        showTyping: req.body.showTyping === 'true' ? true : (req.body.showTyping === 'false' ? false : Boolean(req.body.showTyping))
      };
      
      const validation = insertCampaignSchema.safeParse(processedBody);
      if (!validation.success) {
        return res.status(400).json({ 
          message: fromZodError(validation.error).toString()
        });
      }

      const campaignData = validation.data;
      
      // Create campaign
      const campaign = await storage.createCampaign(campaignData);

      // Process uploaded contacts file if provided
      let contacts: any[] = [];
      if (req.file) {
        const fileValidation = ExcelService.validateExcelFile(req.file);
        if (!fileValidation.valid) {
          return res.status(400).json({ message: fileValidation.error });
        }

        const excelResult = await ExcelService.processExcelFile(req.file.buffer);
        if (!excelResult.success) {
          return res.status(400).json({ 
            message: "Erro ao processar arquivo Excel",
            errors: excelResult.errors
          });
        }

        // Create contacts in database
        const contactsToInsert = excelResult.contacts.map(contact => ({
          campaignId: campaign.id,
          name: contact.name,
          phone: contact.phone,
          customFields: contact.customFields ? JSON.stringify(contact.customFields) : null,
          status: 'pending' as const
        }));

        contacts = await storage.createMultipleContacts(contactsToInsert);

        // Update campaign with total contacts
        await storage.updateCampaign(campaign.id, {
          totalContacts: contacts.length
        });

        await storage.createActivityLog({
          type: 'file_processed',
          message: `Arquivo ${req.file.originalname} processado com sucesso`,
          metadata: JSON.stringify({ 
            campaignId: campaign.id,
            contactsImported: contacts.length,
            errors: excelResult.errors
          })
        });
      }

      res.json({ campaign, contactsImported: contacts.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/campaigns/:id/start", async (req, res) => {
    try {
      const campaignId = req.params.id;
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }

      if (!whatsappService.isConnected()) {
        return res.status(400).json({ message: "WhatsApp não está conectado" });
      }

      // Update campaign status
      await storage.updateCampaign(campaignId, { status: 'active' });

      // Start sending messages in background
      processCampaign(campaignId);

      await storage.createActivityLog({
        type: 'campaign_started',
        message: `Campanha "${campaign.name}" iniciada`,
        metadata: JSON.stringify({ campaignId })
      });

      broadcast({ type: 'campaign_started', data: { campaignId, name: campaign.name } });

      res.json({ message: "Campanha iniciada com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/campaigns/:id/pause", async (req, res) => {
    try {
      const campaignId = req.params.id;
      const campaign = await storage.updateCampaign(campaignId, { status: 'paused' });
      
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }

      await storage.createActivityLog({
        type: 'campaign_paused',
        message: `Campanha "${campaign.name}" pausada`,
        metadata: JSON.stringify({ campaignId })
      });

      broadcast({ type: 'campaign_paused', data: { campaignId, name: campaign.name } });

      res.json({ message: "Campanha pausada com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/campaigns/:id/stop", async (req, res) => {
    try {
      const campaignId = req.params.id;
      const campaign = await storage.updateCampaign(campaignId, { status: 'stopped' });
      
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }

      await storage.createActivityLog({
        type: 'campaign_stopped',
        message: `Campanha "${campaign.name}" interrompida`,
        metadata: JSON.stringify({ campaignId })
      });

      broadcast({ type: 'campaign_stopped', data: { campaignId, name: campaign.name } });

      res.json({ message: "Campanha interrompida com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const campaignId = req.params.id;
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }

      // Delete all contacts associated with the campaign
      await storage.deleteContactsByCampaign(campaignId);
      
      // Delete the campaign
      await storage.deleteCampaign(campaignId);

      await storage.createActivityLog({
        type: 'campaign_deleted',
        message: `Campanha "${campaign.name}" e seus contatos foram excluídos`,
        metadata: JSON.stringify({ campaignId, campaignName: campaign.name })
      });

      broadcast({ type: 'campaign_deleted', data: { campaignId, name: campaign.name } });

      res.json({ message: "Campanha e contatos excluídos com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Activity Logs Routes
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/activity-logs", async (req, res) => {
    try {
      await storage.clearActivityLogs();
      res.json({ message: "Log de atividades limpo com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stats Routes
  app.get("/api/stats", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      
      const totalMessagesSent = campaigns.reduce((sum, campaign) => sum + campaign.sentCount, 0);
      const totalContacts = campaigns.reduce((sum, campaign) => sum + campaign.totalContacts, 0);
      const totalDelivered = campaigns.reduce((sum, campaign) => sum + campaign.deliveredCount, 0);
      
      const deliveryRate = totalMessagesSent > 0 ? (totalDelivered / totalMessagesSent) * 100 : 0;

      res.json({
        activeCampaigns: activeCampaigns.length,
        messagesSent: totalMessagesSent,
        deliveryRate: deliveryRate.toFixed(1),
        contactsImported: totalContacts
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Campaign processing function
  async function processCampaign(campaignId: string) {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign || campaign.status !== 'active') return;

    const contacts = await storage.getContactsByCampaign(campaignId);
    const pendingContacts = contacts.filter(contact => contact.status === 'pending');

    for (const contact of pendingContacts) {
      // Check if campaign is still active
      const currentCampaign = await storage.getCampaign(campaignId);
      if (!currentCampaign || currentCampaign.status !== 'active') {
        break;
      }

      try {
        // Function to replace template variables in any message
        const replaceVariables = (messageText: string) => {
          let processedMessage = messageText;
          processedMessage = processedMessage.replace(/{nome}/g, contact.name);
          processedMessage = processedMessage.replace(/{telefone}/g, contact.phone);
          
          if (contact.customFields) {
            try {
              const customFields = typeof contact.customFields === 'string' 
                ? JSON.parse(contact.customFields) 
                : contact.customFields;
              
              Object.entries(customFields).forEach(([key, value]) => {
                processedMessage = processedMessage.replace(new RegExp(`{${key}}`, 'g'), String(value));
              });
            } catch (error) {
              console.warn('Error parsing custom fields for contact:', contact.id, error);
            }
          }
          return processedMessage;
        };

        // Replace template variables in main message
        let message = replaceVariables(campaign.message);

        // Send message with typing indicator (based on campaign settings)
        const result = await whatsappService.sendMessage(contact.phone, message, 2, { showTyping: campaign.showTyping ?? true });

        if (result.success) {
          await storage.updateContact(contact.id, {
            status: 'sent',
            sentAt: new Date().toISOString()
          });

          await storage.createActivityLog({
            type: 'message_sent',
            message: `Mensagem principal enviada para ${contact.name} (${contact.phone})`,
            metadata: JSON.stringify({
              campaignId,
              contactId: contact.id,
              phone: contact.phone,
              message
            })
          });

          // Process message blocks if they exist
          if (campaign.messageBlocks) {
            try {
              const blocks = JSON.parse(campaign.messageBlocks);
              if (Array.isArray(blocks) && blocks.length > 0) {
                for (let i = 0; i < blocks.length; i++) {
                  const block = blocks[i];
                  if (block && block.trim() !== '') {
                    // Wait for the interval before sending next block
                    await new Promise(resolve => setTimeout(resolve, campaign.messageInterval * 1000));
                    
                    // Check if campaign is still active before sending block
                    const currentCampaignCheck = await storage.getCampaign(campaignId);
                    if (!currentCampaignCheck || currentCampaignCheck.status !== 'active') {
                      console.log('Campaign stopped, skipping remaining blocks');
                      break;
                    }
                    
                    // Process template variables in block message
                    const blockMessage = replaceVariables(block);
                    
                    const blockResult = await whatsappService.sendMessage(contact.phone, blockMessage, 2, { showTyping: campaign.showTyping ?? true });
                    
                    if (blockResult.success) {
                      await storage.createActivityLog({
                        type: 'message_sent',
                        message: `Bloco ${i + 1} enviado para ${contact.name} (${contact.phone})`,
                        metadata: JSON.stringify({
                          campaignId,
                          contactId: contact.id,
                          phone: contact.phone,
                          blockIndex: i + 1,
                          blockMessage
                        })
                      });

                      broadcast({
                        type: 'message_block_sent',
                        data: { 
                          campaignId, 
                          contactId: contact.id, 
                          blockIndex: i + 1, 
                          totalBlocks: blocks.length 
                        }
                      });
                    } else {
                      // Log block send failure
                      await storage.createActivityLog({
                        type: 'error',
                        message: `Falha ao enviar bloco ${i + 1} para ${contact.name}: ${blockResult.error}`,
                        metadata: JSON.stringify({
                          campaignId,
                          contactId: contact.id,
                          phone: contact.phone,
                          blockIndex: i + 1,
                          error: blockResult.error
                        })
                      });
                      
                      // If it's a connection error, stop processing blocks for this contact
                      if (blockResult.error?.includes('detached Frame') || blockResult.error?.includes('não conectado')) {
                        console.log('Connection error detected, stopping block processing for this contact');
                        break;
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error processing message blocks:', error);
              await storage.createActivityLog({
                type: 'error',
                message: `Erro ao processar blocos de mensagem para ${contact.name}: ${error}`,
                metadata: JSON.stringify({
                  campaignId,
                  contactId: contact.id,
                  phone: contact.phone,
                  error: error instanceof Error ? error.message : String(error)
                })
              });
            }
          }

          await storage.updateCampaign(campaignId, {
            sentCount: currentCampaign.sentCount + 1
          });

          broadcast({
            type: 'campaign_progress',
            data: {
              campaignId,
              contactId: contact.id,
              status: 'sent',
              progress: ((currentCampaign.sentCount + 1) / contacts.length) * 100
            }
          });
        } else {
          await storage.updateContact(contact.id, {
            status: 'failed',
            errorMessage: result.error
          });

          await storage.updateCampaign(campaignId, {
            failedCount: currentCampaign.failedCount + 1
          });

          broadcast({
            type: 'campaign_progress',
            data: {
              campaignId,
              contactId: contact.id,
              status: 'failed',
              error: result.error
            }
          });
        }

        // Wait for the configured interval before next message
        await new Promise(resolve => setTimeout(resolve, campaign.messageInterval * 1000));

      } catch (error: any) {
        console.error('Error processing contact:', error);
        await storage.updateContact(contact.id, {
          status: 'failed',
          errorMessage: error.message
        });
      }
    }

    // Mark campaign as completed if all contacts processed
    const finalContacts = await storage.getContactsByCampaign(campaignId);
    const remainingPending = finalContacts.filter(contact => contact.status === 'pending');
    
    if (remainingPending.length === 0) {
      await storage.updateCampaign(campaignId, { status: 'completed' });
      
      await storage.createActivityLog({
        type: 'campaign_completed',
        message: `Campanha "${campaign.name}" concluída`,
        metadata: JSON.stringify({ campaignId })
      });

      broadcast({ type: 'campaign_completed', data: { campaignId, name: campaign.name } });
    }
  }

  // Setup WhatsApp event listeners
  whatsappService.on('qrcode', (data) => {
    broadcast({ type: 'qrcode', data });
  });

  whatsappService.on('connected', (data) => {
    broadcast({ type: 'whatsapp_connected', data });
  });

  whatsappService.on('disconnected', (data) => {
    broadcast({ type: 'whatsapp_disconnected', data });
  });

  whatsappService.on('status', (data) => {
    broadcast({ type: 'whatsapp_status', data });
  });

  // Webhook routes
  const logWebhookRequest = async (req: AuthRequest, endpoint: string, startTime: number, statusCode: number = 200) => {
    const responseTime = Date.now() - startTime;
    const headers = JSON.stringify({
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    });

    await storage.createWebhookLog({
      endpoint,
      method: 'POST',
      requestBody: JSON.stringify(req.body),
      headers,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || null,
      statusCode,
      responseTime,
    });
  };

  app.post("/api/webhook/contact_finished", async (req: AuthRequest, res) => {
    const startTime = Date.now();
    try {
      console.log("📞 Webhook contact_finished received:", req.body);
      
      await logWebhookRequest(req, "/api/webhook/contact_finished", startTime, 200);
      
      // Broadcast to connected WebSocket clients
      broadcast({
        type: 'webhook_received',
        data: {
          endpoint: 'contact_finished',
          body: req.body,
          timestamp: new Date().toISOString()
        }
      });

      res.status(200).json({ message: "Webhook contact_finished processed successfully" });
    } catch (error: any) {
      console.error("Error processing contact_finished webhook:", error);
      await logWebhookRequest(req, "/api/webhook/contact_finished", startTime, 500);
      res.status(500).json({ message: "Error processing webhook", error: error.message });
    }
  });

  app.post("/api/webhook/email_sent", async (req: AuthRequest, res) => {
    const startTime = Date.now();
    try {
      console.log("📧 Webhook email_sent received:", req.body);
      
      await logWebhookRequest(req, "/api/webhook/email_sent", startTime, 200);
      
      // Broadcast to connected WebSocket clients
      broadcast({
        type: 'webhook_received',
        data: {
          endpoint: 'email_sent',
          body: req.body,
          timestamp: new Date().toISOString()
        }
      });

      res.status(200).json({ message: "Webhook email_sent processed successfully" });
    } catch (error: any) {
      console.error("Error processing email_sent webhook:", error);
      await logWebhookRequest(req, "/api/webhook/email_sent", startTime, 500);
      res.status(500).json({ message: "Error processing webhook", error: error.message });
    }
  });

    app.post("/api/webhook/contact_called", async (req: AuthRequest, res) => {
    const startTime = Date.now();
    try {
      console.log("📞 Webhook contact_called received:", req.body);
      
      await logWebhookRequest(req, "/api/webhook/contact_called", startTime, 200);
      
      // Broadcast to connected WebSocket clients
      broadcast({
        type: 'webhook_received',
        data: {
          endpoint: 'contact_called',
          body: req.body,
          timestamp: new Date().toISOString()
        }
      });

      res.status(200).json({ message: "Webhook contact_called processed successfully" });
    } catch (error: any) {
      console.error("Error processing contact_called webhook:", error);
      await logWebhookRequest(req, "/api/webhook/contact_called", startTime, 500);
      res.status(500).json({ message: "Error processing webhook", error: error.message });
    }
  });

  // API route to get webhook logs
  app.get("/api/webhook-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getWebhookLogs(limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Error getting webhook logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // API route to clear webhook logs
  app.delete("/api/webhook-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.clearWebhookLogs();
      res.json({ message: "Webhook logs cleared successfully" });
    } catch (error: any) {
      console.error("Error clearing webhook logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
