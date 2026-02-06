
export type EmailProvider = 'google' | 'emailjs' | 'resend';

export interface EmailJSAccount {
  id: string;
  label: string;
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface Recipient {
  id: string;
  email: string;
  name?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
  provider: EmailProvider;
  activeEmailJSAccountId?: string;
  config: {
    googleClientId?: string;
    resendApiKey?: string;
    resendFrom?: string;
  };
}

export type AppView = 'dashboard' | 'compose' | 'recipients' | 'sending' | 'settings';
