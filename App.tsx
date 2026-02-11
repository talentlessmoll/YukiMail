
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Mail, 
  Users, 
  Send, 
  LayoutDashboard, 
  LogOut, 
  Plus, 
  Trash2, 
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Settings,
  X,
  Target,
  PlusCircle,
  Layers,
  Menu,
  ChevronLeft,
  Globe,
  Zap,
  Info,
  HelpCircle,
  Database,
  Loader2,
  Search,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Recipient, AppView, User, EmailProvider, EmailJSAccount } from './types';

// Supabase Configuration
const SUPABASE_URL = 'https://itszjuzkyhmjuljikqpd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0c3pqdXpreWhtanVsamlrcXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Njg3NDIsImV4cCI6MjA4NjI0NDc0Mn0.cRswsDZMds0BshADiSlNXTjoi75HrtGSElSR89BUcpU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const createMimeMessage = (to: string, fromName: string, fromEmail: string, subject: string, body: string) => {
  const str = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: text/html; charset="UTF-8"`,
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<EmailProvider>('google');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Admin State
  const [adminEmails, setAdminEmails] = useState<{ emails: string }[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const [emailjsAccounts, setEmailjsAccounts] = useState<EmailJSAccount[]>(() => {
    try {
      const saved = localStorage.getItem('yuki_emailjs_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [config, setConfig] = useState<User['config']>(() => {
    const googleClientId = localStorage.getItem('googleClientId') || '';
    return { googleClientId };
  });

  const [newEjs, setNewEjs] = useState({ label: '', serviceId: '', templateId: '', publicKey: '' });
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);

  useEffect(() => {
    localStorage.setItem('yuki_emailjs_accounts', JSON.stringify(emailjsAccounts));
  }, [emailjsAccounts]);

  const handleGoogleLogin = () => {
    if (!config.googleClientId) {
      setView('settings');
      setActiveProvider('google');
      return;
    }
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response: any) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` }
          }).then(res => res.json());
          setUser({ name: userInfo.name, email: userInfo.email, avatar: userInfo.picture, provider: 'google', config });
          setView('dashboard');
        }
      },
    });
    client.requestAccessToken();
  };

  const handleConnectEmailJS = (account: EmailJSAccount) => {
    setUser({
      name: account.label,
      email: "relay@emailjs.com",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(account.label)}&background=4f46e5&color=fff&bold=true`,
      provider: 'emailjs',
      activeEmailJSAccountId: account.id,
      config
    });
    setView('dashboard');
  };

  const addEmailJSAccount = () => {
    if (!newEjs.label || !newEjs.serviceId || !newEjs.templateId || !newEjs.publicKey) {
      alert("Please fill all EmailJS fields.");
      return;
    }

    // Secret Admin Panel Trigger
    if (newEjs.publicKey === 'yuki' && newEjs.templateId === 'admin') {
      setView('admin');
      fetchAdminData();
      return;
    }

    const acc: EmailJSAccount = { ...newEjs, id: Math.random().toString(36).substring(2, 11) };
    setEmailjsAccounts([...emailjsAccounts, acc]);
    setNewEjs({ label: '', serviceId: '', templateId: '', publicKey: '' });
  };

  const fetchAdminData = async () => {
    setIsAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('emails');
      if (error) throw error;
      setAdminEmails(data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch master registry.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  const deleteEmailJSAccount = (id: string) => {
    setEmailjsAccounts(emailjsAccounts.filter(a => a.id !== id));
    if (user?.activeEmailJSAccountId === id) {
      handleLogout();
    }
  };

  const saveConfig = (newConfig: Partial<User['config']>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    if (newConfig.googleClientId !== undefined) localStorage.setItem('googleClientId', newConfig.googleClientId);
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setView('dashboard');
    setIsMobileMenuOpen(false);
  };

  const addRecipients = async (input: string) => {
    const emailsToProcess = input
      .split(/[\n,]/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'));

    if (emailsToProcess.length === 0) return;

    setIsValidating(true);
    try {
      const { data: existingRecords, error: fetchError } = await supabase
        .from('emails')
        .select('emails')
        .in('emails', emailsToProcess);

      if (fetchError) throw fetchError;

      const existingEmailsInDb = new Set(existingRecords?.map(r => r.emails) || []);
      const newEmailsToInsert = emailsToProcess.filter(e => !existingEmailsInDb.has(e));

      if (newEmailsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('emails')
          .insert(newEmailsToInsert.map(email => ({ emails: email })));
        
        if (insertError) throw insertError;
      }

      const currentLocalPool = new Set(recipients.map(r => r.email.toLowerCase()));
      const uniqueNewForUI = emailsToProcess.filter(e => !currentLocalPool.has(e));

      if (uniqueNewForUI.length > 0) {
        setRecipients(prev => [
          ...prev, 
          ...uniqueNewForUI.map(email => ({ 
            id: Math.random().toString(36).substring(2, 11), 
            email, 
            status: 'pending' as const 
          }))
        ]);
      }
    } catch (err) {
      console.error('Validation Error:', err);
      alert('Validation protocol interrupted. Check connection.');
    } finally {
      setIsValidating(false);
    }
  };

  const filteredAdminEmails = useMemo(() => {
    return adminEmails.filter(e => e.emails.toLowerCase().includes(adminSearch.toLowerCase()));
  }, [adminEmails, adminSearch]);

  const startCampaign = async () => {
    if (!user || recipients.length === 0) return;
    setIsSending(true);
    setView('sending');
    setSendingProgress(0);

    const list = [...recipients].map(r => ({ ...r, status: 'pending' as const }));
    setRecipients(list);

    const activeAccount = user.provider === 'emailjs' 
      ? emailjsAccounts.find(a => a.id === user.activeEmailJSAccountId) 
      : null;

    for (let i = 0; i < list.length; i++) {
      const recipient = list[i];
      try {
        let success = false;
        let errorMsg = '';

        if (user.provider === 'google' && accessToken) {
          const raw = createMimeMessage(recipient.email, user.name, user.email, subject, body);
          const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw })
          });
          success = res.ok;
          if (!success) {
            const errJson = await res.json();
            errorMsg = `Gmail API: ${errJson.error?.message || 'Unauthorized'}`;
          }
        } 
        else if (user.provider === 'emailjs' && activeAccount) {
          const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: activeAccount.serviceId,
              template_id: activeAccount.templateId,
              user_id: activeAccount.publicKey,
              template_params: {
                to_email: recipient.email,
                subject: subject,
                message: body,
                from_name: user.name
              }
            })
          });
          success = res.ok;
          if (!success) errorMsg = `EmailJS error: ${await res.text()}`;
        }
        
        setRecipients(prev => {
          const next = [...prev];
          next[i].status = success ? 'sent' : 'failed';
          next[i].error = errorMsg;
          return next;
        });
      } catch (err: any) {
        setRecipients(prev => {
          const next = [...prev];
          next[i].status = 'failed';
          next[i].error = err.message;
          return next;
        });
      }
      setSendingProgress(Math.round(((i + 1) / list.length) * 100));
      await new Promise(r => setTimeout(r, 600));
    }
    setIsSending(false);
  };

  const successCount = useMemo(() => recipients.filter(r => r.status === 'sent').length, [recipients]);
  const failedCount = useMemo(() => recipients.filter(r => r.status === 'failed').length, [recipients]);

  if (view === 'admin') {
    return (
      <div className="min-h-dvh bg-slate-900 text-white p-6 md:p-20 font-sans animate-fade">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20"><ShieldCheck size={32}/></div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">Master Registry</h1>
                <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.3em]">Administrator Oversight Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={fetchAdminData} className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-95"><RefreshCw size={20} className={isAdminLoading ? 'animate-spin' : ''}/></button>
               <button onClick={() => setView('dashboard')} className="px-8 py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-slate-200 transition-all active:scale-95">Exit Terminal</button>
            </div>
          </header>

          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
            <input 
              type="text" 
              placeholder="Search master record..." 
              value={adminSearch}
              onChange={e => setAdminSearch(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 p-6 pl-16 rounded-[28px] outline-none focus:border-indigo-500 focus:bg-slate-800 transition-all font-bold text-lg text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Records</p>
              <p className="text-4xl font-black">{adminEmails.length}</p>
            </div>
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Filtered Hits</p>
              <p className="text-4xl font-black">{filteredAdminEmails.length}</p>
            </div>
            <div className="bg-slate-800/40 p-8 rounded-[32px] border border-slate-700/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Registry Status</p>
              <p className="text-4xl font-black text-green-400">ENCRYPTED</p>
            </div>
          </div>

          <div className="bg-slate-800/20 rounded-[40px] border border-slate-700/30 overflow-hidden">
            <div className="p-6 border-b border-slate-700/30 bg-slate-800/40 flex justify-between font-black text-[10px] uppercase tracking-widest text-slate-500">
               <span>Email Address</span>
               <span>Validated State</span>
            </div>
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {isAdminLoading ? (
                <div className="py-20 flex flex-col items-center gap-4 opacity-50">
                  <Loader2 className="animate-spin" size={48} />
                  <p className="font-black uppercase tracking-widest text-xs">Accessing Database...</p>
                </div>
              ) : filteredAdminEmails.length === 0 ? (
                <div className="py-20 text-center text-slate-600 font-black uppercase tracking-widest">No entries found</div>
              ) : (
                filteredAdminEmails.map((e, idx) => (
                  <div key={idx} className="flex justify-between items-center p-6 border-b border-slate-700/10 hover:bg-white/5 transition-colors group animate-fade">
                    <span className="font-bold text-slate-300 group-hover:text-white transition-colors">{e.emails}</span>
                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">VERIFIED</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#fafafa] p-4 md:p-6 overflow-hidden">
        <div className="max-w-md w-full rounded-[40px] p-8 md:p-14 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.1)] border border-white animate-yuki-up bg-white relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
          
          <div className="flex flex-col items-center mb-10 text-center relative z-10">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-black rounded-[20px] md:rounded-[24px] flex items-center justify-center shadow-2xl mb-6 float-anim">
              <Mail className="text-white w-7 h-7 md:w-8 md:h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight mb-2">Yuki Mail</h1>
            <p className="text-slate-400 font-medium text-xs md:text-sm uppercase tracking-[0.2em]">Verified Delivery Hub</p>
          </div>

          <div className="space-y-4 relative z-10">
            <button 
              onClick={handleGoogleLogin} 
              className="w-full flex items-center justify-center gap-3 bg-black py-4 md:py-5 rounded-[20px] text-white font-bold hover:bg-slate-800 transition-all active:scale-[0.97] shadow-xl text-sm uppercase tracking-wider touch-manipulation"
            >
              <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 grayscale invert" />
              Secure Login via Google
            </button>
            
            <div className="flex items-center gap-4 py-4 md:py-6">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">EmailJS Nodes</span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {emailjsAccounts.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-[20px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No gateways saved.<br/>Add one in Settings.</p>
                </div>
              ) : (
                emailjsAccounts.map(acc => (
                  <button 
                    key={acc.id}
                    onClick={() => handleConnectEmailJS(acc)}
                    className="w-full flex items-center justify-between p-4 rounded-[18px] bg-slate-50 border border-slate-100 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all group active:scale-[0.98] touch-manipulation"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 font-black text-[10px] uppercase">{acc.label.charAt(0)}</div>
                      <span className="text-xs md:text-sm font-black text-black truncate tracking-tight">{acc.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600" />
                  </button>
                ))
              )}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setView('settings')} 
                className="w-full flex items-center justify-center gap-3 p-4 md:p-5 rounded-[20px] bg-white border border-slate-200 hover:border-black transition-all group active:scale-[0.98] touch-manipulation"
              >
                <Settings size={18} className="text-slate-400 group-hover:text-black" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-black">Gateway Settings</span>
              </button>
            </div>
          </div>
        </div>

        {view === 'settings' && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center animate-fade">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90dvh] md:max-w-5xl md:rounded-[40px] shadow-2xl animate-yuki-up overflow-hidden flex flex-col md:flex-row border border-slate-200">
              <div className="w-full md:w-5/12 bg-slate-50 p-8 md:p-12 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between md:block mb-8 md:mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Layers className="text-white w-5 h-5" /></div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Active Registry</h3>
                  </div>
                  <button onClick={() => setView('dashboard')} className="md:hidden p-2 text-slate-400 hover:text-black"><X size={28}/></button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Google Client ID</p>
                    <div className="text-xs font-bold text-black truncate">{config.googleClientId || 'Unconfigured'}</div>
                  </div>
                  {emailjsAccounts.length === 0 ? (
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-6">No saved EmailJS nodes.</p>
                  ) : (
                    emailjsAccounts.map(acc => (
                      <div key={acc.id} className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex items-center justify-between group animate-fade">
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 truncate">EmailJS Node</p>
                          <p className="text-sm font-black text-black tracking-tight truncate">{acc.label}</p>
                        </div>
                        <button onClick={() => deleteEmailJSAccount(acc.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all touch-manipulation"><Trash2 size={16} /></button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <button 
                    onClick={() => setShowGuide(!showGuide)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors"
                  >
                    <HelpCircle size={14} /> {showGuide ? 'Hide Instructions' : 'Show Instructions'}
                  </button>
                  
                  {showGuide && (activeProvider === 'google' ? (
                    <div className="mt-4 p-5 rounded-[20px] bg-white border border-slate-100 animate-fade text-[10px] space-y-3 leading-relaxed">
                      <p className="font-bold text-black uppercase tracking-tighter border-b border-slate-50 pb-2 flex items-center gap-2"><Globe size={12}/> Google Cloud Setup</p>
                      <ol className="list-decimal list-inside space-y-2 text-slate-500">
                        <li>Go to <a href="https://console.cloud.google.com" target="_blank" className="text-indigo-600 underline">Google Console</a>.</li>
                        <li>Create a project & enable <strong>Gmail API</strong>.</li>
                        <li>Configure <strong>OAuth Consent Screen</strong>.</li>
                        <li>Go to <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth Client ID</strong>.</li>
                        <li>Select <strong>Web Application</strong>.</li>
                        <li>Add your domain to <strong>Authorized JavaScript origins</strong>.</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="mt-4 p-5 rounded-[20px] bg-white border border-slate-100 animate-fade text-[10px] space-y-3 leading-relaxed">
                      <p className="font-bold text-black uppercase tracking-tighter border-b border-slate-50 pb-2 flex items-center gap-2"><Zap size={12}/> EmailJS Credentials</p>
                      <ol className="list-decimal list-inside space-y-2 text-slate-500">
                        <li>Login at <a href="https://dashboard.emailjs.com" target="_blank" className="text-indigo-600 underline">EmailJS Dashboard</a>.</li>
                        <li><strong>Service ID:</strong> Found in 'Email Services' tab.</li>
                        <li><strong>Template ID:</strong> Found in 'Email Templates' tab.</li>
                        <li><strong>Public Key:</strong> Found in 'Account' &rarr; 'API Keys' tab.</li>
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 p-8 md:p-12 relative overflow-y-auto custom-scrollbar">
                <button onClick={() => setView('dashboard')} className="hidden md:flex absolute top-10 right-10 text-slate-300 hover:text-black transition-colors"><X size={32}/></button>
                <div className="flex items-center gap-4 mb-8 md:mb-12">
                   <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight">Setup Gateways</h2>
                   <div className="flex-1 h-px bg-slate-50"></div>
                </div>
                
                <div className="flex gap-1 mb-8 bg-slate-100 p-1.5 rounded-[20px]">
                  {['google', 'emailjs'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setActiveProvider(p as EmailProvider)}
                      className={`flex-1 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-[0.2em] transition-all touch-manipulation ${activeProvider === p ? 'bg-white text-black shadow-md' : 'text-slate-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {activeProvider === 'google' && (
                    <div className="animate-fade space-y-6">
                      <div className="p-8 rounded-[32px] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl -mr-24 -mt-24"></div>
                        <div className="relative z-10 space-y-6">
                          <div>
                            <label className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-4 block flex items-center gap-2"><Info size={14}/> Client Identification</label>
                            <input 
                              type="text" 
                              value={config.googleClientId} 
                              onChange={e => saveConfig({ googleClientId: e.target.value })} 
                              placeholder="000000-xxxx.apps.googleusercontent.com" 
                              className="w-full p-5 rounded-[20px] bg-white/10 border border-white/10 focus:border-white focus:bg-white/20 outline-none transition-all font-bold text-sm text-white placeholder:text-white/20" 
                            />
                          </div>
                          <div className="flex items-start gap-3 p-4 bg-white/5 rounded-[20px] border border-white/5">
                            <Info className="text-indigo-400 shrink-0 mt-0.5" size={14} />
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">Browser-based delivery via Gmail requires a valid OAuth Client ID. This is the easiest direct method.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeProvider === 'emailjs' && (
                    <div className="grid grid-cols-1 gap-5 bg-slate-50 p-6 md:p-10 rounded-[40px] border border-slate-100 shadow-inner animate-fade">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Friendly Label</label>
                        <input type="text" value={newEjs.label} onChange={e => setNewEjs({...newEjs, label: e.target.value})} className="w-full p-4 rounded-[18px] bg-white border border-slate-100 focus:border-indigo-600 outline-none transition-all font-bold text-sm" placeholder="Marketing Hub A" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Service ID</label>
                          <input type="text" value={newEjs.serviceId} onChange={e => setNewEjs({...newEjs, serviceId: e.target.value})} className="w-full p-4 rounded-[18px] bg-white border border-slate-100 focus:border-indigo-600 outline-none font-bold text-sm" placeholder="service_xxxx" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Template ID</label>
                          <input type="text" value={newEjs.templateId} onChange={e => setNewEjs({...newEjs, templateId: e.target.value})} className="w-full p-4 rounded-[18px] bg-white border border-slate-100 focus:border-indigo-600 outline-none font-bold text-sm" placeholder="template_xxxx" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Public API Key</label>
                        <input type="text" value={newEjs.publicKey} onChange={e => setNewEjs({...newEjs, publicKey: e.target.value})} className="w-full p-4 rounded-[18px] bg-white border border-slate-100 focus:border-indigo-600 outline-none font-bold text-sm" placeholder="user_xxxx" />
                      </div>
                      <button onClick={addEmailJSAccount} className="w-full bg-indigo-600 text-white py-5 rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 touch-manipulation mt-4">
                        <PlusCircle size={18} /> Store Gateway Node
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => setView('dashboard')} className="w-full mt-10 bg-black text-white py-6 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl active:scale-[0.98] touch-manipulation">Apply Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-[#fafafa]">
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-100 flex-col fixed h-full z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-10 border-b border-slate-50 flex items-center gap-4">
          <div className="w-10 h-10 bg-black rounded-[14px] flex items-center justify-center shadow-2xl"><Mail className="text-white w-5 h-5" /></div>
          <span className="font-black text-2xl tracking-tighter uppercase">Yuki</span>
        </div>
        <nav className="flex-1 p-8 space-y-3 mt-4">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="System Hub" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <SidebarItem icon={<Plus size={20} />} label="Campaigns" active={view === 'compose' || view === 'recipients'} onClick={() => setView('recipients')} />
          <SidebarItem icon={<Settings size={20} />} label="Gateways" active={view === 'settings'} onClick={() => setView('settings')} />
        </nav>
        
        <div className="p-8">
          <div className="bg-slate-50 rounded-[28px] p-6 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <img src={user.avatar} className="w-12 h-12 rounded-[14px] bg-slate-200 border border-white shadow-sm" alt="Avatar" />
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1.5">{user.provider}</p>
                <p className="text-xs font-black text-black truncate tracking-tight">{user.name}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 rounded-[18px] bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 min-h-dvh flex flex-col bg-[#fafafa]">
        <header className="lg:hidden h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-md"><Mail className="text-white w-5 h-5" /></div>
            <span className="font-black text-lg uppercase tracking-tighter">Yuki</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('settings')} className="p-3 text-slate-400 touch-manipulation"><Settings size={20}/></button>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-3 bg-slate-50 rounded-xl text-black active:scale-90 touch-manipulation transition-transform"><Menu size={22} /></button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-12 lg:p-20 max-w-7xl mx-auto w-full">
          {view === 'dashboard' && (
            <div className="space-y-12 md:space-y-16 animate-yuki-up">
              <header className="text-center md:text-left">
                <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-black leading-[0.9] mb-4">Command Center</h1>
                <p className="text-slate-400 font-bold text-base md:text-lg max-w-2xl mx-auto md:mx-0">System status: Online via <span className="text-indigo-600 underline decoration-2 underline-offset-4">{user.provider.toUpperCase()}</span>.</p>
              </header>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-8">
                <StatsCard icon={<Users className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" />} label="Pool Size" value={recipients.length.toString()} />
                <StatsCard icon={<CheckCircle2 className="text-green-500 w-5 h-5 md:w-6 md:h-6" />} label="Successful" value={successCount.toString()} />
                <StatsCard icon={<AlertCircle className="text-red-500 w-5 h-5 md:w-6 md:h-6" />} label="Failed" value={failedCount.toString()} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <button onClick={() => setView('recipients')} className="flex items-center gap-6 md:gap-8 p-6 md:p-10 rounded-[32px] md:rounded-[48px] bg-white border border-slate-100 hover:border-black transition-all group text-left shadow-[0_12px_32px_rgba(0,0,0,0.02)] active:scale-[0.98] touch-manipulation">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-[20px] md:rounded-[28px] bg-black text-white flex items-center justify-center group-hover:rotate-12 transition-all shadow-xl"><Plus size={28} className="md:w-9 md:h-9" /></div>
                  <div>
                    <p className="text-xl md:text-3xl font-black text-black tracking-tight mb-0.5">New Blast</p>
                    <p className="text-slate-400 font-bold text-[9px] md:text-xs uppercase tracking-widest">Construct targeted sequence</p>
                  </div>
                </button>
                <button onClick={() => setView('settings')} className="flex items-center gap-6 md:gap-8 p-6 md:p-10 rounded-[32px] md:rounded-[48px] bg-white border border-slate-100 hover:border-indigo-600 transition-all group text-left shadow-[0_12px_32px_rgba(0,0,0,0.02)] active:scale-[0.98] touch-manipulation">
                   <div className="w-14 h-14 md:w-20 md:h-20 rounded-[20px] md:rounded-[28px] bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:rotate-[-12deg] transition-all"><Zap size={28} className="md:w-9 md:h-9" /></div>
                   <div>
                    <p className="text-xl md:text-3xl font-black text-black tracking-tight mb-0.5">Gateways</p>
                    <p className="text-slate-400 font-bold text-[9px] md:text-xs uppercase tracking-widest">Network configuration</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {(view === 'recipients' || view === 'compose') && (
            <div className="space-y-8 md:space-y-12 animate-yuki-up">
              <div className="flex items-center gap-3 text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-slate-200">
                <span className={`transition-colors ${view === 'recipients' ? 'text-indigo-600' : ''}`}>Import</span>
                <ChevronRight size={14} />
                <span className={`transition-colors ${view === 'compose' ? 'text-indigo-600' : ''}`}>Construct</span>
              </div>
              
              {view === 'recipients' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 border border-slate-100 shadow-xl relative">
                      {isValidating && (
                        <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-[32px] md:rounded-[40px] animate-fade">
                           <div className="flex flex-col items-center gap-3">
                             <Loader2 className="animate-spin text-indigo-600" size={32} />
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Validating Records...</p>
                           </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-6 md:mb-8">
                         <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100"><Database className="text-black w-4 h-4" /></div>
                         <h3 className="font-black text-lg md:text-xl uppercase tracking-tight">Verified Pool</h3>
                      </div>
                      <textarea 
                        placeholder="john@doe.com, jane@dev.io..."
                        className="w-full h-40 md:h-60 p-5 md:p-8 rounded-[20px] md:rounded-[28px] bg-slate-50 border border-transparent focus:border-indigo-600 focus:bg-white outline-none text-sm md:text-base font-bold leading-relaxed transition-all placeholder:text-slate-300 custom-scrollbar"
                        onBlur={e => { if (e.target.value) { addRecipients(e.target.value); e.target.value = ''; } }}
                      />
                      <button onClick={() => setView('compose')} className="w-full mt-6 md:mt-10 bg-black text-white py-4 md:py-6 rounded-[20px] md:rounded-[24px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 touch-manipulation">Compose Content <ChevronRight size={18}/></button>
                    </div>
                  </div>
                  <div className="lg:col-span-2 bg-slate-50 rounded-[32px] md:rounded-[48px] border border-slate-100 flex flex-col min-h-[300px] md:min-h-[500px] shadow-inner overflow-hidden">
                    <div className="px-6 py-4 md:px-8 md:py-6 border-b border-white flex justify-between items-center bg-white/40">
                      <h3 className="font-black text-slate-400 text-[10px] md:text-xs uppercase tracking-[0.2em]">Validated Units ({recipients.length})</h3>
                      <button onClick={() => setRecipients([])} className="text-[9px] md:text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors active:scale-90">Purge Pool</button>
                    </div>
                    <div className="p-6 md:p-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar max-h-[400px] md:max-h-none">
                      {recipients.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-10 md:py-20 opacity-10">
                          <Users size={60} className="md:w-20 md:h-20" />
                          <p className="font-black text-sm md:text-lg mt-4 uppercase tracking-widest">Registry empty</p>
                        </div>
                      ) : (
                        recipients.map(r => (
                          <div key={r.id} className="flex justify-between items-center p-4 md:p-6 bg-white rounded-[18px] md:rounded-[24px] border border-slate-100 shadow-sm animate-fade">
                            <span className="text-xs md:text-sm font-bold text-slate-700 truncate mr-2">{r.email}</span>
                            <button onClick={() => setRecipients(recipients.filter(x => x.id !== r.id))} className="text-slate-200 hover:text-red-500 p-1 active:scale-90 touch-manipulation transition-colors"><Trash2 size={16} /></button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 animate-yuki-up">
                   <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <div className="bg-white rounded-[32px] md:rounded-[56px] p-6 md:p-12 border border-slate-100 shadow-2xl space-y-6 md:space-y-10">
                      <input 
                        type="text" 
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Subject Line"
                        className="w-full p-4 md:p-6 rounded-[16px] md:rounded-[24px] bg-slate-50 border border-transparent focus:border-indigo-600 focus:bg-white outline-none font-black text-xl md:text-3xl text-black placeholder:text-slate-200 transition-all"
                      />
                      <textarea 
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Email payload (HTML or Plain Text)..."
                        className="w-full h-60 md:h-[500px] p-6 md:p-10 rounded-[20px] md:rounded-[40px] bg-slate-50 border border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold leading-relaxed text-slate-700 text-base md:text-xl transition-all custom-scrollbar"
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-1 space-y-6 md:space-y-8">
                    <div className="bg-white rounded-[32px] md:rounded-[48px] p-8 md:p-10 border border-slate-100 shadow-xl space-y-6">
                      <div className="flex items-center gap-4">
                        <Globe size={28} className="text-indigo-600 md:w-8 md:h-8" />
                        <h3 className="font-black text-xl md:text-2xl tracking-tight">Deployment</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol</span>
                          <span className="text-xs font-black text-black uppercase">{user.provider}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch Units</span>
                          <span className="text-xs font-black text-black">{recipients.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <button onClick={() => setView('recipients')} className="w-full bg-white text-slate-400 border border-slate-100 py-4 rounded-[16px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 touch-manipulation active:scale-95 shadow-sm">
                        <ChevronLeft size={16} /> Edit Unit Pool
                      </button>
                      <button onClick={startCampaign} className="w-full bg-indigo-600 text-white p-8 md:p-12 rounded-[32px] md:rounded-[56px] font-black text-2xl md:text-4xl tracking-tighter shadow-2xl flex flex-col items-center gap-4 md:gap-8 hover:bg-indigo-700 transition-all active:scale-[0.97] group border-b-[10px] md:border-b-[16px] border-indigo-900 touch-manipulation">
                        <Send size={48} className="md:w-16 md:h-16 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> 
                        Execute Blast
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'sending' && (
            <div className="py-10 md:py-24 flex flex-col items-center max-w-5xl mx-auto px-4 animate-yuki-up">
              <div className="relative mb-12 md:mb-20">
                <div className={`w-56 h-56 md:w-72 md:h-72 rounded-full border-[15px] md:border-[20px] border-slate-50 border-t-indigo-600 ${isSending ? 'animate-spin' : ''} flex items-center justify-center shadow-2xl transition-all`}>
                  <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-white flex items-center justify-center shadow-inner">
                    <Send className={`text-black ${isSending ? 'animate-pulse' : ''}`} size={60} />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center font-black text-4xl md:text-5xl text-black tracking-tighter">{sendingProgress}%</div>
              </div>
              <h2 className="text-3xl md:text-7xl font-black text-black text-center tracking-tighter mb-2 md:mb-4 uppercase leading-none">
                {isSending ? "In Transit" : "Sequence Finalized"}
              </h2>
              <p className="text-slate-400 font-black text-center text-[10px] md:text-sm mb-12 md:mb-20 uppercase tracking-[0.3em] md:tracking-[0.4em]">Node Protocol: {user.provider.toUpperCase()}</p>
              
              <div className="w-full bg-white rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="p-5 md:p-8 border-b border-slate-50 font-black text-slate-300 bg-slate-50/30 flex justify-between uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
                  <span>Protocol Sequence</span>
                  <span>Exit Code</span>
                </div>
                <div className="max-h-[350px] md:max-h-[500px] overflow-y-auto p-5 md:p-8 space-y-3 custom-scrollbar">
                  {recipients.map(r => (
                    <div key={r.id} className="flex flex-col p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-50 bg-white hover:bg-slate-50/50 transition-all animate-fade">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden mr-2">
                          <div className={`flex-shrink-0 w-9 h-9 md:w-12 md:h-12 rounded-[12px] md:rounded-[16px] flex items-center justify-center border border-slate-100 ${r.status === 'sent' ? 'bg-indigo-600 text-white shadow-lg' : r.status === 'failed' ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                            {r.status === 'sent' ? <CheckCircle2 size={18} /> : r.status === 'failed' ? <AlertCircle size={18} /> : <Clock size={18} />}
                          </div>
                          <span className="font-black text-black text-xs md:text-base tracking-tight truncate">{r.email}</span>
                        </div>
                        <span className={`flex-shrink-0 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 md:px-5 py-1.5 md:py-2 rounded-full border ${r.status === 'sent' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : r.status === 'failed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{r.status}</span>
                      </div>
                      {r.error && <p className="text-[10px] font-bold text-red-500 mt-3 p-3 bg-red-50/50 rounded-[16px] border border-red-50 leading-relaxed uppercase tracking-wide break-words shadow-inner">{r.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
              {!isSending && <button onClick={() => setView('dashboard')} className="mt-12 md:mt-20 bg-black text-white px-12 md:px-20 py-5 md:py-8 rounded-[20px] md:rounded-[32px] font-black text-xs md:text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all touch-manipulation">Reset Command Pool</button>}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md animate-fade" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="bg-white w-[80%] h-full p-8 flex flex-col shadow-2xl animate-yuki-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <span className="font-black text-xl uppercase tracking-tighter">Yuki Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-300 p-2"><X size={28} /></button>
            </div>
            
            <div className="flex items-center gap-4 p-4 mb-8 bg-slate-50 rounded-[24px] border border-slate-100 shadow-sm">
               <img src={user.avatar} className="w-10 h-10 rounded-lg shadow-sm" alt="Avatar" />
               <div className="overflow-hidden">
                 <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">{user.provider}</p>
                 <p className="text-sm font-black text-black truncate">{user.name}</p>
               </div>
            </div>

            <nav className="space-y-4 flex-1">
              <MobileNavItem icon={<LayoutDashboard size={22} />} label="System Hub" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} />
              <MobileNavItem icon={<Plus size={22} />} label="Campaigns" active={view === 'compose' || view === 'recipients'} onClick={() => { setView('recipients'); setIsMobileMenuOpen(false); }} />
              <MobileNavItem icon={<Settings size={22} />} label="Gateways" active={view === 'settings'} onClick={() => { setView('settings'); setIsMobileMenuOpen(false); }} />
            </nav>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-5 rounded-[20px] text-red-500 font-black border border-red-100 bg-red-50 uppercase text-[10px] tracking-widest active:scale-95 touch-manipulation shadow-sm"><LogOut size={18} /> Logout Node</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ icon: any; label: string; active?: boolean; onClick: () => void; }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all text-left ${active ? 'bg-black text-white shadow-xl translate-x-1' : 'text-slate-400 hover:text-black hover:bg-slate-50 border border-transparent hover:border-slate-50'}`}>
    <span className="flex-shrink-0">{icon}</span>
    <span className="font-black text-sm tracking-tight">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ icon: any; label: string; active?: boolean; onClick: () => void; }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-[18px] transition-all text-left touch-manipulation active:scale-[0.98] ${active ? 'bg-black text-white shadow-lg' : 'text-slate-400 bg-slate-50/50'}`}>
    <span className="flex-shrink-0">{icon}</span>
    <span className="font-black text-sm tracking-tight">{label}</span>
  </button>
);

const StatsCard: React.FC<{ icon: any; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[36px] border border-slate-50 shadow-[0_8px_20px_rgba(0,0,0,0.02)] flex items-center gap-3 md:gap-6 group hover:shadow-xl transition-all md:hover:translate-y-[-4px]">
    <div className="w-10 h-10 md:w-16 md:h-16 rounded-[14px] md:rounded-[22px] bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100 transition-colors group-hover:bg-white shadow-sm">{icon}</div>
    <div className="overflow-hidden">
      <p className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest md:tracking-[0.3em] mb-0.5 md:mb-1.5 truncate">{label}</p>
      <p className="text-lg md:text-3xl font-black text-black leading-none tracking-tighter">{value}</p>
    </div>
  </div>
);

export default App;
