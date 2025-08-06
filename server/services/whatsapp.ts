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
          this.emit('qrcode', { qr: `${base64Qr}`, ascii: asciiQR });
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
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
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

  async sendMessage(to: string, message: string, retries = 2, options?: { 
    showTyping?: boolean, 
    typingDuration?: number 
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'WhatsApp not connected' };
    }

    try {
      // Format phone number (remove special characters and add country code if needed)
      const formattedNumber = this.formatPhoneNumber(to);
      console.log(`Sending message to: ${to} -> ${formattedNumber}`);
      
      // Check connection state before sending
      try {
        const state = await this.client.getConnectionState();
        if (state !== 'CONNECTED') {
          return { success: false, error: `WhatsApp não conectado. Estado: ${state}` };
        }
      } catch (stateError) {
        console.warn('Could not check connection state:', stateError);
      }

      // Show typing indicator if requested
      if (options?.showTyping !== false) {
        const typingDuration = options?.typingDuration || this.calculateTypingDuration(message);
        console.log(`Showing typing for ${typingDuration}ms for message: ${message.substring(0, 50)}...`);
        
        try {
          await this.client.startTyping(formattedNumber);
          await new Promise(resolve => setTimeout(resolve, typingDuration));
          await this.client.stopTyping(formattedNumber);
        } catch (typingError) {
          console.warn('Error with typing indicator:', typingError);
          // Continue with message sending even if typing fails
        }
      }
      
      await this.client.sendText(formattedNumber, message);
      this.emit('messageSent', { to: to, formattedNumber: formattedNumber, message });
      
      return { success: true };
    } catch (error: any) {
      console.error(`Error sending message to ${to} (formatted: ${this.formatPhoneNumber(to)}):`, error);
      
      // If it's a detached frame error and we have retries left, try to reconnect
      if (error.message.includes('detached Frame') && retries > 0) {
        console.log(`Frame detached, attempting reconnection. Retries left: ${retries}`);
        
        try {
          // Disconnect and reconnect
          await this.disconnect();
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
          
          // Restart connection
          this.isConnecting = true;
          await this.connect();
          
          // Wait for connection to be established
          let connectionAttempts = 0;
          while (connectionAttempts < 15 && this.isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            connectionAttempts++;
          }
          
          if (this.client) {
            // Retry sending the message
            return await this.sendMessage(to, message, retries - 1, options);
          } else {
            return { success: false, error: 'Falha ao reconectar após erro de Frame' };
          }
        } catch (reconnectError: any) {
          console.error('Reconnection failed:', reconnectError);
          return { success: false, error: `Erro ao reconectar: ${reconnectError.message}` };
        }
      }
      
      this.emit('messageError', { to, message, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate realistic typing duration based on message length
   * Simulates human typing speed: ~3-4 characters per second
   */
  private calculateTypingDuration(message: string): number {
    const wordsPerMinute = 40; // Average typing speed
    const charactersPerSecond = (wordsPerMinute * 5) / 60; // ~3.33 chars/sec
    const baseDuration = (message.length / charactersPerSecond) * 1000;
    
    // Add some randomness (±20%) and ensure minimum/maximum duration
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const duration = baseDuration * randomFactor;
    
    // Ensure duration is between 2 and 8 seconds for realistic feel
    return Math.max(2000, Math.min(8000, Math.floor(duration)));
  }

  /**
   * Send message with custom typing settings
   */
  async sendMessageWithTyping(to: string, message: string, typingDuration?: number): Promise<{ success: boolean; error?: string }> {
    return this.sendMessage(to, message, 2, { 
      showTyping: true, 
      typingDuration 
    });
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, remove it (some Brazilian numbers have leading 0)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // If it already has country code 55, keep as is
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      // Already formatted correctly
    } else if (cleaned.length === 10 || cleaned.length === 11) {
      // Add Brazil country code for valid Brazilian numbers
      cleaned = '55' + cleaned;
    } else if (cleaned.length === 8 || cleaned.length === 9) {
      // Probably missing area code, this will fail validation
      console.warn(`Phone number seems incomplete: ${phone} -> ${cleaned}`);
    }
    
    // Validate the final format
    if (cleaned.length < 12 || cleaned.length > 13 || !cleaned.startsWith('55')) {
      console.warn(`Invalid phone number format: ${phone} -> ${cleaned}`);
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
