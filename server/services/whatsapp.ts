import { create, Whatsapp } from '@wppconnect-team/wppconnect';
import { EventEmitter } from 'events';

export interface WhatsappMessage {
  to: string;
  message: string;
}

export interface WhatsappStatus {
  isConnected: boolean;
  sessionName: string;
  deviceName?: string;
  lastActivity?: Date;
}

export class WhatsappService extends EventEmitter {
  private client: Whatsapp | null = null;
  private sessionName: string;
  private isConnecting: boolean = false;

  constructor(sessionName: string = 'session_001') {
    super();
    this.sessionName = sessionName;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.client) {
      return;
    }

    this.isConnecting = true;
    this.emit('status', { status: 'connecting', sessionName: this.sessionName });

    try {
      this.client = await create(
        this.sessionName,
        (base64Qr: string, asciiQR: string) => {
          console.log('QR Code generated');
          this.emit('qrcode', { qr: `data:image/png;base64,${base64Qr}`, ascii: asciiQR });
        },
        (statusSession: string, session: string) => {
          console.log('Status Session:', statusSession, 'Session:', session);
          this.emit('status', { status: statusSession, sessionName: session });
        },
        undefined, // onLoadingScreen
        undefined, // catchLinkCode
        {
          headless: true,
          devtools: false,
          useChrome: true,
          debug: false,
          logQR: false,
          browserWS: '',
          browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ],
        }
      );

      if (this.client) {
        await this.setupEventListeners();
        this.emit('connected', { sessionName: this.sessionName });
      }
    } catch (error) {
      console.error('Error connecting to WhatsApp:', error);
      this.emit('error', error);
    } finally {
      this.isConnecting = false;
    }
  }

  private async setupEventListeners(): Promise<void> {
    if (!this.client) return;

    this.client.onMessage((message: any) => {
      this.emit('message', message);
    });

    this.client.onAck((ack: any) => {
      this.emit('ack', ack);
    });

    this.client.onStateChange((state: any) => {
      this.emit('stateChange', state);
    });
  }

  async sendMessage(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'WhatsApp not connected' };
    }

    try {
      // Format phone number (remove special characters and add country code if needed)
      const formattedNumber = this.formatPhoneNumber(to);
      
      await this.client.sendText(formattedNumber, message);
      this.emit('messageSent', { to: formattedNumber, message });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error sending message:', error);
      this.emit('messageError', { to, message, error: error.message });
      return { success: false, error: error.message };
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming Brazil +55)
    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    // Ensure it ends with @c.us for WhatsApp
    return cleaned + '@c.us';
  }

  async getStatus(): Promise<WhatsappStatus> {
    const isConnected = this.client !== null;
    
    return {
      isConnected,
      sessionName: this.sessionName,
      deviceName: isConnected ? 'Chrome Desktop' : undefined,
      lastActivity: isConnected ? new Date() : undefined,
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing WhatsApp client:', error);
      }
      this.client = null;
      this.emit('disconnected', { sessionName: this.sessionName });
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// Singleton instance
export const whatsappService = new WhatsappService();
