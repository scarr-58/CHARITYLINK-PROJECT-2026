import React, { useState, useEffect } from 'react';
import { 
  Droplet, 
  GraduationCap, 
  Heart, 
  ShieldCheck, 
  Users, 
  Search, 
  LogOut, 
  ArrowLeft, 
  UploadCloud, 
  Award, 
  Sparkles,
  SearchCode,
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
  ThumbsUp,
  Mail,
  User as UserIcon,
  ChevronRight,
  Plus,
  X,
  HelpCircle,
  Send,
  Check,
  Activity,
  Trash2,
  Users2,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Trophy,
  Crown,
  Medal,
  Moon,
  Sun,
  Download,
  Pencil,
  Wand2,
  Filter,
  PartyPopper
} from 'lucide-react';
import { Campaign, User, UserRole, ImpactItem } from './types';
import { INITIAL_CAMPAIGNS, CATEGORIES } from './data';
import ImageCropper from './components/ImageCropper';
import { DonutChart, HBarChart, AreaChart, categoryColor } from './components/Charts';
import { motion, AnimatePresence } from 'motion/react';

// Donor giving tiers (mirrors the server thresholds).
const GIVING_TIERS = [
  { name: 'Seedling', min: 0, icon: '🌱', color: '#94a3b8' },
  { name: 'Bronze Guardian', min: 5000, icon: '🥉', color: '#b45309' },
  { name: 'Silver Guardian', min: 25000, icon: '🥈', color: '#64748b' },
  { name: 'Gold Guardian', min: 75000, icon: '🥇', color: '#d97706' },
  { name: 'Platinum Guardian', min: 200000, icon: '💎', color: '#0ea5e9' },
];
function tierFor(total: number) {
  let current = GIVING_TIERS[0];
  for (const t of GIVING_TIERS) if (total >= t.min) current = t;
  const idx = GIVING_TIERS.indexOf(current);
  const next = GIVING_TIERS[idx + 1] || null;
  const progress = next ? Math.min(100, Math.round(((total - current.min) / (next.min - current.min)) * 100)) : 100;
  return { current, next, progress };
}

export default function App() {
  // --- STATE ---
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('charitylink_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [myContributions, setMyContributions] = useState<any[]>([]);

  const [activePage, setActivePage] = useState<'home' | 'browse' | 'detail' | 'login' | 'profile' | 'analytics'>(() => {
    // Sync starting view with current user existence or simple routing
    const path = window.location.hash.replace('#', '');
    if (['home', 'browse', 'detail', 'login', 'profile', 'analytics'].includes(path)) {
      return path as any;
    }
    return 'home';
  });

  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Custom Donation process
  const [donationAmount, setDonationAmount] = useState<number>(5000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [donationSuccess, setDonationSuccess] = useState<boolean>(false);

  // Authentication Tabs / Inputs
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('donor');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  // Registration Profile Photo States
  const [registeredPhotoUrl, setRegisteredPhotoUrl] = useState<string>('');

  // Image Cropping States
  const [cropperSource, setCropperSource] = useState<string | null>(null);
  const [cropperContext, setCropperContext] = useState<'register' | 'profile' | null>(null);

  // Interactive Nav Modals states
  const [showStartCampaignModal, setShowStartCampaignModal] = useState<boolean>(false);
  const [showQuickDonateModal, setShowQuickDonateModal] = useState<boolean>(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);

  // Start Campaign Form states
  const [ncTitle, setNcTitle] = useState('');
  const [ncOrg, setNcOrg] = useState('');
  const [ncDesc, setNcDesc] = useState('');
  const [ncShort, setNcShort] = useState('');
  const [ncTarget, setNcTarget] = useState<string>('300000');
  const [ncCategory, setNcCategory] = useState('Water');
  const [ncIcon, setNcIcon] = useState('🌱');
  const [ncColor, setNcColor] = useState('#eafaf1');
  const [ncSuccess, setNcSuccess] = useState<boolean>(false);

  // Quick Donate Form states
  const [qdCampaignId, setQdCampaignId] = useState<string>('');
  const [qdAmount, setQdAmount] = useState<number>(5000);
  const [qdCustomStr, setQdCustomStr] = useState<string>('');
  const [qdName, setQdName] = useState<string>('');
  const [qdEmail, setQdEmail] = useState<string>('');
  const [qdPhone, setQdPhone] = useState<string>('');
  const [qdMethod, setQdMethod] = useState<string>('M-Pesa Express');
  const [qdIsLoading, setQdIsLoading] = useState<boolean>(false);
  const [qdSuccess, setQdSuccess] = useState<boolean>(false);

  // Registration admin access code (only required when registering as admin)
  const [registerAdminCode, setRegisterAdminCode] = useState<string>('');

  // Records the last completed donation so success screens show the real
  // amount/campaign even after the input fields are cleared.
  const [lastDonation, setLastDonation] = useState<{ amount: number; campaignTitle: string; method: string } | null>(null);
  // Controls the donation receipt popup shown after a successful contribution.
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Admin dashboard data
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminContributions, setAdminContributions] = useState<any[]>([]);

  // Dark mode (persisted; defaults to the OS preference)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('charitylink_theme');
    if (saved) return saved === 'dark';
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });

  // Analytics / activity / leaderboard data
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Browse sort order
  const [sortBy, setSortBy] = useState<'default' | 'mostFunded' | 'nearlyThere' | 'newest' | 'mostDonors'>('default');

  // Campaign editing (reuses the Start Campaign modal in edit mode)
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);

  // AI assistant states
  const [aiCopyLoading, setAiCopyLoading] = useState<boolean>(false);
  const [aiImpactText, setAiImpactText] = useState<string>('');
  const [aiImpactLoading, setAiImpactLoading] = useState<boolean>(false);

  // Celebration confetti
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Toast Alerts
  const [toast, setToast] = useState<{ message: string; show: boolean } | null>(null);

  // Sync hashes for a nice bookmarkable app experience
  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]);

  // Apply & persist the theme by toggling `.dark` on the <html> element.
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('charitylink_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load public analytics, activity feed and leaderboard.
  const fetchAnalytics = async () => {
    try {
      const [aRes, actRes, lbRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/activity?limit=15'),
        fetch('/api/leaderboard'),
      ]);
      if (aRes.ok) setAnalytics(await aRes.json());
      if (actRes.ok) setActivityFeed(await actRes.json());
      if (lbRes.ok) setLeaderboard(await lbRes.json());
    } catch (e) {
      console.error('Failed to load analytics/activity/leaderboard.', e);
    }
  };
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Reset the AI impact text whenever a different campaign is opened.
  useEffect(() => {
    setAiImpactText('');
  }, [selectedCampaignId]);

  // Load campaigns from server database
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (e) {
      console.error("Failed to fetch campaigns from DB", e);
    }
  };

  const fetchMyContributions = async (email: string) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(email)}/contributions`);
      if (res.ok) {
        const data = await res.json();
        setMyContributions(data);
      }
    } catch (e) {
      console.error("Failed to fetch personal contributions ledger.", e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMyContributions(currentUser.email);
      if (currentUser.role === 'admin') {
        fetchAdminData();
      }
    } else {
      setMyContributions([]);
      setAdminUsers([]);
      setAdminContributions([]);
    }
  }, [currentUser]);

  // Persists current user on modification
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('charitylink_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('charitylink_user');
    }
  }, [currentUser]);

  // Toast trigger
  const triggerToast = (msg: string) => {
    setToast({ message: msg, show: true });
    // Clear timeout safeguard
    setTimeout(() => {
      setToast(prev => prev && prev.message === msg ? { ...prev, show: false } : prev);
    }, 3500);
  };

  // Sync Quick Donate identity to logged in user
  useEffect(() => {
    if (currentUser) {
      setQdName(currentUser.name);
      setQdEmail(currentUser.email);
    } else {
      setQdName('');
      setQdEmail('');
    }
  }, [currentUser, showQuickDonateModal]);

  // Sync selected campaign when Quick Donate modal opens if we don't have one selected
  useEffect(() => {
    if (showQuickDonateModal && campaigns.length > 0 && !qdCampaignId) {
      setQdCampaignId(campaigns[0].id.toString());
    }
  }, [showQuickDonateModal, campaigns, qdCampaignId]);

  // Handler to Create & launch a new campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncTitle || !ncOrg || !ncDesc || !ncShort || !ncTarget) {
      triggerToast("Please fill in all details to launch your campaign.");
      return;
    }
    const targetNum = Number(ncTarget);
    if (isNaN(targetNum) || targetNum <= 0) {
      triggerToast("Please enter a valid target goal amount (KES).");
      return;
    }

    if (!currentUser || !canCreateCampaign) {
      triggerToast("Only organisation or admin accounts can launch campaigns.");
      return;
    }

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ncTitle,
          org: ncOrg,
          desc: ncDesc,
          short: ncShort,
          target: targetNum,
          category: ncCategory,
          icon: ncIcon,
          color: ncColor,
          requesterEmail: currentUser.email,
          ownerEmail: currentUser.email
        })
      });

      if (res.ok) {
        await fetchCampaigns();
        triggerToast("Campaign created & launched live in Kenya! 🎉");
        setNcSuccess(true);
        // Reset local states
        setNcTitle('');
        setNcOrg('');
        setNcDesc('');
        setNcShort('');
        setNcTarget('300000');
      } else {
        const errorData = await res.json();
        triggerToast(errorData.error || "Failed to launch campaign.");
      }
    } catch (err) {
      triggerToast("Network error trying to connect to the Express server.");
    }
  };

  // Handler for Quick Donation checkout prompt simulation
  const handleQuickDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const campaignId = Number(qdCampaignId);

    if (!campaignId) {
      triggerToast("Please select a campaign to support!");
      return;
    }

    const finalAmount = qdCustomStr ? parseInt(qdCustomStr) : qdAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      triggerToast("Please enter a valid donation amount in KES!");
      return;
    }

    if (qdMethod === 'M-Pesa Express' && !qdPhone) {
      triggerToast("Please enter your M-Pesa phone number for prompt routing!");
      return;
    }

    setQdIsLoading(true);
    triggerToast(`Payment prompt sent to ${qdPhone || 'mobile device'}... Please check your screen.`);

    const selectedCampaignTitle = campaigns.find(c => c.id === campaignId)?.title || 'this campaign';

    try {
      if (qdMethod === 'M-Pesa Express') {
        // Trigger STK Push and then poll the status endpoint until Safaricom's
        // (or the sandbox simulation's) callback resolves the payment.
        const res = await fetch('/api/mpesa/stkpush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId,
            amountKES: finalAmount,
            phone: qdPhone,
            donorEmail: qdEmail || currentUser?.email || 'anonymous@charitylink.org',
            donorName: qdName || currentUser?.name || 'Anonymous Steward'
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          triggerToast(err.error || 'Failed to initiate M-Pesa STK Push');
          setQdIsLoading(false);
          return;
        }

        const pushData = await res.json();
        triggerToast(`M-Pesa prompt sent to ${qdPhone}. Authorize on your phone to complete payment.`);

        const outcome = await pollMpesaStatus(pushData.checkoutRequestId);
        if (outcome === 'completed') {
          await fetchCampaigns();
          if (currentUser) {
            await fetchMyContributions(currentUser.email);
            setCurrentUser(prev => prev ? {
              ...prev,
              totalContributed: (prev.totalContributed || 0) + finalAmount,
              campaignsSupported: (prev.campaignsSupported || 0) + 1
            } : null);
          }
          setLastDonation({ amount: finalAmount, campaignTitle: selectedCampaignTitle, method: 'M-Pesa STK Push' });
          setQdSuccess(true);
          setQdCustomStr('');
          triggerConfetti();
          fetchAnalytics();
          triggerToast(`Thank you! KES ${finalAmount.toLocaleString()} received via M-Pesa! 🎉`);
        } else if (outcome === 'failed') {
          triggerToast('M-Pesa payment was declined or cancelled. Please try again.');
        } else {
          triggerToast('Still awaiting M-Pesa confirmation. Check your ledger shortly.');
        }
        setQdIsLoading(false);
      } else {
        // Fallback to existing simulation flow for non-M-Pesa gateways.
        setTimeout(async () => {
          try {
            const res2 = await fetch(`/api/campaigns/${campaignId}/donate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: finalAmount,
                donorEmail: qdEmail || currentUser?.email || "anonymous@charitylink.org",
                donorName: qdName || currentUser?.name || "Anonymous Steward",
                paymentMethod: qdMethod
              })
            });

            if (res2.ok) {
              await fetchCampaigns();
              if (currentUser) {
                await fetchMyContributions(currentUser.email);
                // Dynamic stats increment
                setCurrentUser(prev => prev ? {
                  ...prev,
                  totalContributed: (prev.totalContributed || 0) + finalAmount,
                  campaignsSupported: (prev.campaignsSupported || 0) + 1
                } : null);
              }
              setLastDonation({ amount: finalAmount, campaignTitle: selectedCampaignTitle, method: qdMethod });
              setQdSuccess(true);
              setQdCustomStr('');
              triggerConfetti();
              fetchAnalytics();
              triggerToast(`Thank you! KES ${finalAmount.toLocaleString()} verified and recorded! 🎉`);
            } else {
              triggerToast("Failed to process transaction on server.");
            }
          } catch {
            triggerToast("Network error executing checkout.");
          } finally {
            setQdIsLoading(false);
          }
        }, 1500);
      }
    } catch {
      triggerToast('Network error executing M-Pesa STK Push.');
      setQdIsLoading(false);
    }
  };

  // --- IMAGE UPLOAD & INTERACTIVE ADJUSTMENT ---
  const handlePfpUploadChange = (e: React.ChangeEvent<HTMLInputElement>, context: 'register' | 'profile') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce size limit of 60MB
    const limit60MB = 60 * 1024 * 1024;
    if (file.size > limit60MB) {
      triggerToast("Failed: Profile photo size cannot exceed 60MB!");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropperSource(reader.result);
        setCropperContext(context);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Clean input
  };

  const handleCropSave = async (croppedDataUrl: string) => {
    if (cropperContext === 'register') {
      setRegisteredPhotoUrl(croppedDataUrl);
      triggerToast("Circular profile photo loaded and adjusted!");
    } else if (cropperContext === 'profile' && currentUser) {
      try {
        const res = await fetch('/api/auth/update-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUser.email, photoUrl: croppedDataUrl })
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          triggerToast("Profile photo dynamically updated & fitted!");
        } else {
          triggerToast("Could not update profile photo on the database.");
        }
      } catch (err) {
        triggerToast("Network error updating profile photo.");
      }
    }
    setCropperSource(null);
    setCropperContext(null);
  };

  const handleCropCancel = () => {
    setCropperSource(null);
    setCropperContext(null);
    triggerToast("Photo adjustment cancelled.");
  };

  // --- ACTIONS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!loginEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      newErrors.loginEmail = "Please enter a valid email address.";
    }
    if (!loginPassword) {
      newErrors.loginPassword = "Password is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        triggerToast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`);
        setActivePage('home');
        setLoginEmail('');
        setLoginPassword('');
      } else {
        const errorData = await res.json();
        triggerToast(errorData.error || "Authentication failed. Try again.");
      }
    } catch (err) {
      triggerToast("Network error. Could not connect to database.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!registerName.trim()) {
      newErrors.regName = "Full name is required to verify identity.";
    }
    if (!registerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail)) {
      newErrors.regEmail = "A valid email address is required.";
    }
    if (registerPassword.length < 8) {
      newErrors.regPassword = "Password must be at least 8 characters.";
    }
    if (selectedRole === 'admin' && !registerAdminCode.trim()) {
      newErrors.regAdminCode = "An admin access code is required to register as an administrator.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          role: selectedRole,
          photoUrl: registeredPhotoUrl,
          adminCode: registerAdminCode
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        triggerToast(`Congratulations, ${data.user.name.split(' ')[0]}! Account created securely 🎉`);
        setActivePage('home');
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisteredPhotoUrl('');
        setRegisterAdminCode('');
      } else {
        const errorData = await res.json();
        triggerToast(errorData.error || "Failed to register account.");
      }
    } catch (err) {
      triggerToast("Network error connecting to database.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    triggerToast("You have been logged out securely.");
    setActivePage('home');
  };

  const handleDonateSubmit = async (campaignId: number) => {
    const finalAmount = customAmountStr ? parseInt(customAmountStr) : donationAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      triggerToast("Please enter a valid amount to donate!");
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          donorEmail: currentUser?.email,
          donorName: currentUser?.name || "Anonymous Steward",
          paymentMethod: 'M-Pesa Express'
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        await fetchCampaigns();
        if (currentUser) {
          await fetchMyContributions(currentUser.email);
          setCurrentUser(prev => prev ? {
            ...prev,
            totalContributed: (prev.totalContributed || 0) + finalAmount,
            campaignsSupported: (prev.campaignsSupported || 0) + 1
          } : null);
        }
        // Capture the real donated amount BEFORE clearing the input, so the
        // confirmation shows the correct value (previously it fell back to the
        // default preset after customAmountStr was reset).
        setLastDonation({
          amount: finalAmount,
          campaignTitle: data?.campaign?.title || 'this campaign',
          method: 'M-Pesa Express'
        });
        setDonationSuccess(true);
        setShowReceiptModal(true);
        setCustomAmountStr('');
        triggerConfetti();
        fetchAnalytics();
        triggerToast(`Successfully contributed KES ${finalAmount.toLocaleString()}! Thank you for your transparency!`);
      } else {
        triggerToast("Failed to process donation transaction.");
      }
    } catch (err) {
      triggerToast("Network error submitting donation.");
    }
  };

  const handleShareCampaign = (campaign: Campaign) => {
    const fakeUrl = `${window.location.origin}/#detail?id=${campaign.id}`;
    navigator.clipboard.writeText(fakeUrl);
    triggerToast("Direct payment & campaign link copied to clipboard!");
  };

  // Delete a campaign (admin: any; organisation: only its own).
  const handleDeleteCampaign = async (campaign: Campaign) => {
    if (!currentUser) return;
    const confirmed = window.confirm(`Permanently delete "${campaign.title}"?\n\nThis removes the campaign and its contribution records. This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}?requesterEmail=${encodeURIComponent(currentUser.email)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchCampaigns();
        if (role === 'admin') await fetchAdminData();
        triggerToast(`Campaign "${campaign.title}" was deleted.`);
        if (activePage === 'detail') setActivePage('browse');
      } else {
        const err = await res.json().catch(() => ({}));
        triggerToast(err.error || "Failed to delete campaign.");
      }
    } catch {
      triggerToast("Network error while deleting campaign.");
    }
  };

  // Load platform-wide data for the admin dashboard.
  const fetchAdminData = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const q = `requesterEmail=${encodeURIComponent(currentUser.email)}`;
      const [uRes, cRes] = await Promise.all([
        fetch(`/api/admin/users?${q}`),
        fetch(`/api/admin/contributions?${q}`)
      ]);
      if (uRes.ok) setAdminUsers(await uRes.json());
      if (cRes.ok) setAdminContributions(await cRes.json());
    } catch (e) {
      console.error("Failed to load admin dashboard data.", e);
    }
  };

  // Poll the STK push status endpoint until the async callback resolves it.
  const pollMpesaStatus = async (checkoutRequestId: string, maxTries = 12): Promise<'completed' | 'failed' | 'timeout'> => {
    for (let i = 0; i < maxTries; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/mpesa/status/${encodeURIComponent(checkoutRequestId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed') return 'completed';
          if (data.status === 'failed') return 'failed';
        }
      } catch {
        // keep polling
      }
    }
    return 'timeout';
  };

  // Fire a short confetti celebration.
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3200);
  };

  // Generate & download a PNG donation receipt from the last donation.
  const downloadReceipt = () => {
    if (!lastDonation) return;
    const W = 720, H = 460;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0a3d1f'; ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px Inter, Arial, sans-serif';
    ctx.fillText('CharityLink', 40, 50);
    ctx.fillStyle = '#8fd6a9'; ctx.font = '15px Inter, Arial, sans-serif';
    ctx.fillText('Official Donation Receipt · Transparent Giving', 40, 76);

    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 12px Inter, Arial, sans-serif';
    ctx.fillText('AMOUNT DONATED', 40, 150);
    ctx.fillStyle = '#0a3d1f'; ctx.font = 'bold 52px Inter, Arial, sans-serif';
    ctx.fillText(`KES ${lastDonation.amount.toLocaleString()}`, 40, 205);

    const rows: [string, string][] = [
      ['Campaign', lastDonation.campaignTitle],
      ['Payment Method', lastDonation.method],
      ['Donor', currentUser?.name || 'Anonymous Steward'],
      ['Date', new Date().toLocaleString()],
      ['Status', 'CONFIRMED ✓'],
    ];
    let y = 260;
    ctx.textBaseline = 'alphabetic';
    for (const [k, v] of rows) {
      ctx.fillStyle = '#64748b'; ctx.font = 'bold 14px Inter, Arial, sans-serif';
      ctx.fillText(k, 40, y);
      ctx.fillStyle = '#0f172a'; ctx.font = '15px Inter, Arial, sans-serif';
      const text = v.length > 52 ? v.slice(0, 51) + '…' : v;
      ctx.fillText(text, 230, y);
      ctx.strokeStyle = '#eef2f0'; ctx.beginPath(); ctx.moveTo(40, y + 14); ctx.lineTo(W - 40, y + 14); ctx.stroke();
      y += 40;
    }
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px Inter, Arial, sans-serif';
    ctx.fillText('100% verified · zero-commission · every shilling tracked in real time.', 40, H - 24);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `charitylink-receipt-${Date.now()}.png`;
    a.click();
    triggerToast('Receipt downloaded 📄');
  };

  // AI: generate campaign copy from a one-line idea (fills the Start Campaign form).
  const handleGenerateCopy = async () => {
    if (!ncShort.trim() && !ncTitle.trim()) {
      triggerToast('Type a short idea or title first, then let AI expand it.');
      return;
    }
    setAiCopyLoading(true);
    try {
      const res = await fetch('/api/ai/campaign-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ncShort || ncTitle, category: ncCategory, org: ncOrg })
      });
      if (res.ok) {
        const data = await res.json();
        setNcShort(data.short || ncShort);
        setNcDesc(data.desc || ncDesc);
        triggerToast(data.source === 'ai' ? 'AI drafted your campaign copy ✨' : 'Draft generated ✨ (add a GEMINI_API_KEY for live AI)');
      } else {
        triggerToast('Could not generate copy right now.');
      }
    } catch {
      triggerToast('Network error contacting the AI assistant.');
    } finally {
      setAiCopyLoading(false);
    }
  };

  // AI: fetch a tangible impact sentence for the current donation amount.
  const fetchAiImpact = async (campaign: Campaign, amount: number) => {
    if (!amount || amount <= 0) { setAiImpactText(''); return; }
    setAiImpactLoading(true);
    try {
      const res = await fetch('/api/ai/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, campaignTitle: campaign.title, category: campaign.category })
      });
      if (res.ok) {
        const data = await res.json();
        setAiImpactText(data.text || '');
      }
    } catch {
      setAiImpactText('');
    } finally {
      setAiImpactLoading(false);
    }
  };

  // Open the campaign modal in EDIT mode, pre-filled with a campaign's values.
  const handleOpenEditCampaign = (c: Campaign) => {
    setEditingCampaignId(c.id);
    setNcTitle(c.title);
    setNcOrg(c.org);
    setNcDesc(c.desc);
    setNcShort(c.short);
    setNcTarget(String(c.target));
    setNcCategory(c.category);
    setNcIcon(c.icon);
    setNcColor(c.color);
    setNcSuccess(false);
    setShowStartCampaignModal(true);
  };

  // Save edits to an existing campaign.
  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || editingCampaignId === null) return;
    const targetNum = Number(ncTarget);
    if (!ncTitle || !ncOrg || !ncDesc || !ncShort || isNaN(targetNum) || targetNum <= 0) {
      triggerToast('Please complete all fields with a valid target.');
      return;
    }
    try {
      const res = await fetch(`/api/campaigns/${editingCampaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ncTitle, org: ncOrg, desc: ncDesc, short: ncShort,
          target: targetNum, category: ncCategory, icon: ncIcon, color: ncColor,
          requesterEmail: currentUser.email
        })
      });
      if (res.ok) {
        await fetchCampaigns();
        if (role === 'admin') await fetchAdminData();
        triggerToast('Campaign updated successfully.');
        setShowStartCampaignModal(false);
        setEditingCampaignId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerToast(err.error || 'Failed to update campaign.');
      }
    } catch {
      triggerToast('Network error updating campaign.');
    }
  };

  // --- COMPUTED ---
  const activeCampaign = selectedCampaignId !== null
    ? campaigns.find(c => c.id === selectedCampaignId)
    : null;

  const filteredCampaigns = campaigns.filter(c => {
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.short.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.org.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'mostFunded': return b.raised - a.raised;
      case 'nearlyThere': return (b.raised / b.target) - (a.raised / a.target);
      case 'newest': return b.id - a.id;
      case 'mostDonors': return b.donors - a.donors;
      default: return 0;
    }
  });

  // --- ROLE-BASED ACCESS HELPERS ---
  const role = currentUser?.role;
  const canCreateCampaign = role === 'organisation' || role === 'admin';
  const canDeleteCampaign = (c: Campaign): boolean => {
    if (role === 'admin') return true;
    if (role === 'organisation' && c.ownerEmail && currentUser) {
      return c.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();
    }
    return false;
  };
  // Campaigns owned by the currently logged-in organisation.
  const myOwnedCampaigns = currentUser
    ? campaigns.filter(c => c.ownerEmail && c.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
    : [];

  // --- LIVE PLATFORM STATS (computed from real campaign data) ---
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.raised || 0), 0);
  const totalDonors = campaigns.reduce((sum, c) => sum + (c.donors || 0), 0);
  const verifiedPct = campaigns.length
    ? Math.round((campaigns.filter(c => c.verified).length / campaigns.length) * 100)
    : 100;
  const formatKES = (n: number): string => {
    if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
    return `KES ${n.toLocaleString()}`;
  };
  const timeAgo = (ts: string): string => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };
  const methodColors = ['#2a78d6', '#1baf7a', '#eda100', '#e34948'];

  return (
    <div className="min-h-screen bg-[#f4f6f4] dark:bg-[#0a120e] text-[#1c2b22] dark:text-gray-100 font-sans flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900 transition-colors">
      
      {/* ── HEADER NAVIGATION ── */}
      <nav className="bg-[#0a3d1f] text-white px-4 md:px-8 py-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div 
            onClick={() => setActivePage('home')} 
            className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
            id="nav-logo"
          >
            <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-[#0a3d1f] fill-[#0a3d1f]" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">
              Charity<span className="text-[#2ecc71]">Link</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setActivePage('home')}
              className={`text-sm font-semibold transition-colors cursor-pointer hover:text-white ${activePage === 'home' ? 'text-white underline underline-offset-4 decoration-2 decoration-emerald-400' : 'text-emerald-200'}`}
              id="nav-home"
            >
              Home
            </button>
            <button 
              onClick={() => {
                setSelectedCategory('All');
                setActivePage('browse');
              }}
              className={`text-sm font-semibold transition-colors cursor-pointer hover:text-white ${activePage === 'browse' || activePage === 'detail' ? 'text-white underline underline-offset-4 decoration-2 decoration-emerald-400' : 'text-emerald-200'}`}
              id="nav-browse"
            >
              Campaigns
            </button>
            <button
              onClick={() => setActivePage('analytics')}
              className={`hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors cursor-pointer hover:text-white ${activePage === 'analytics' ? 'text-white underline underline-offset-4 decoration-2 decoration-emerald-400' : 'text-emerald-200'}`}
              id="nav-insights"
            >
              <BarChart3 className="w-4 h-4" /> Insights
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="text-emerald-200 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Quick Trigger CTAs — creating campaigns is restricted to
                organisation and admin accounts. */}
            {canCreateCampaign && (
              <button
                onClick={() => {
                  setEditingCampaignId(null);
                  setNcTitle(''); setNcOrg(''); setNcDesc(''); setNcShort(''); setNcTarget('300000');
                  setNcSuccess(false);
                  setShowStartCampaignModal(true);
                }}
                className="hidden sm:inline-block px-3 py-1.5 rounded-md text-xs font-bold text-emerald-100 border border-emerald-300/30 hover:border-white hover:text-white transition-all cursor-pointer"
              >
                Start Campaign
              </button>
            )}

            <button 
              onClick={() => {
                setQdSuccess(false);
                setShowQuickDonateModal(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-3.5 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              Donate Now
            </button>

            {/* Authentication States */}
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-emerald-800/80">
                <button 
                  onClick={() => setActivePage('profile')} 
                  className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                  title="View Profile Details"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-700 overflow-hidden border border-white/20 flex items-center justify-center font-bold text-sm text-white group-hover:border-emerald-300 transition-colors">
                    {currentUser.photoUrl ? (
                      <img src={currentUser.photoUrl} alt="Pfp" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden md:inline text-sm font-semibold text-emerald-100 group-hover:text-white transition-all">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-emerald-300 hover:text-white transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setAuthTab('login');
                  setActivePage('login');
                }}
                className="bg-transparent border border-gray-400 text-gray-300 hover:text-white hover:border-white px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer"
                id="nav-login-btn"
              >
                Log In
              </button>
            )}

          </div>
        </div>
      </nav>

      {/* ── MAIN PAGES ROUTER ── */}
      <main className="flex-1 w-full flex flex-col">
        
        {/* 1. HOME VIEW */}
        {activePage === 'home' && (
          <div className="w-full flex flex-col anim-fade-in">
            {/* Hero Card */}
            <section className="bg-gradient-to-br from-[#0a3d1f] via-[#145a32] to-[#1a7340] text-white py-16 px-4 md:px-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,204,113,0.15),transparent)] pointer-events-none" />
              <div className="max-w-4xl mx-auto flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 bg-emerald-800/50 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Transparent Charitable Giving in Kenya
                </div>
                <h1 className="font-serif text-3xl md:text-5xl font-bold max-w-3xl leading-tight mb-6">
                  Every Shilling Tracked.<br className="sm:hidden" /> Every Impact Verified.
                </h1>
                <p className="text-emerald-100/90 max-w-2xl text-sm md:text-base leading-relaxed mb-8 font-medium">
                  CharityLink connects donors with verified grassroot campaigns, providing real-time transparency so your contribution reaches those who need it most.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button 
                    onClick={() => {
                      setSelectedCategory('All');
                      setActivePage('browse');
                    }}
                    className="w-full sm:w-auto px-7 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                  >
                    Explore Campaigns
                  </button>
                  <button 
                    onClick={() => setShowHowItWorksModal(true)}
                    className="w-full sm:w-auto px-7 py-3 rounded-lg bg-transparent border-2 border-emerald-300/40 hover:border-white text-white font-semibold text-base hover:bg-white/5 transition-all cursor-pointer"
                  >
                    How It Works
                  </button>
                </div>
              </div>
            </section>

            {/* Micro Stats Belt */}
            <section className="bg-white dark:bg-[#0f1c16] border-b border-emerald-100/60 dark:border-white/10 shadow-sm">
              <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-emerald-100/40">
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">{formatKES(totalRaised)}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Total Raised</div>
                </div>
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">{campaigns.length}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Active Campaigns</div>
                </div>
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">{totalDonors.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Donors</div>
                </div>
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">{verifiedPct}%</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Verified Orgs</div>
                </div>
              </div>
            </section>

            {/* Featured Section */}
            <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 w-full">
              <div className="flex justify-between items-baseline mb-8">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#0a3d1f] dark:text-white">Featured Campaigns</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">High-priority humanitarian and environmental tasks in urgent need of assistance</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCategory('All');
                    setActivePage('browse');
                  }}
                  className="font-bold text-sm text-emerald-700 hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Grid (First 3 item matches) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.slice(0, 3).map((c) => {
                  const percentFunded = Math.round((c.raised / c.target) * 100);
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        setSelectedCampaignId(c.id);
                        setDonationSuccess(false);
                        setActivePage('detail');
                      }}
                      className="bg-white dark:bg-[#13251c] rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-emerald-50/70 dark:border-white/10 transition-all hover:-translate-y-1 cursor-pointer flex flex-col h-full"
                    >
                      {/* Splash Icon Wrapper */}
                      <div 
                        className="py-10 text-center text-5xl select-none font-bold"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.icon}
                      </div>

                      {/* Content Body */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3 text-xs font-bold">
                          <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full uppercase tracking-wider">{c.category}</span>
                          {c.verified && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#145a32] px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Verified
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-emerald-800 transition-colors line-clamp-2">
                          {c.title}
                        </h3>
                        <p className="text-gray-500 text-xs leading-relaxed mb-6 line-clamp-3">
                          {c.short}
                        </p>

                        <div className="mt-auto space-y-3">
                          {/* Progress bar */}
                          <div>
                            <div className="w-full bg-emerald-100/50 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, percentFunded)}%` }} />
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1.5 text-gray-500">
                              <span className="font-bold text-emerald-800">KES {c.raised.toLocaleString()}</span>
                              <span>{percentFunded}% of KES {c.target.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-emerald-50/50">
                            <span className="text-xs text-gray-500 font-medium">
                              <strong className="text-gray-800 font-bold">{c.donors}</strong> donors
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCampaignId(c.id);
                                setDonationSuccess(false);
                                setActivePage('detail');
                              }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs py-1.5 px-3.5 rounded-lg shadow-sm transition-all"
                            >
                              Donate
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* 2. BROWSE CAMPAIGNS VIEW */}
        {activePage === 'browse' && (
          <div className="w-full flex flex-col anim-fade-in">
            
            {/* Browser Header */}
            <section className="bg-[#0a3d1f] text-white py-12 px-4 md:px-8 text-center sm:text-left">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">Browse Campaigns</h2>
                  <p className="text-emerald-200/90 text-sm mt-1">Discover verified communities in need of water, health, and classroom bursary funds.</p>
                </div>
                {/* Search frame */}
                <div className="w-full sm:max-w-md flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-emerald-800 absolute left-3 top-3.5" />
                    <input 
                      type="text" 
                      placeholder="Search campaigns, counties, orgs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white text-[#1c2b22] pl-9 pr-3 py-2.5 rounded-lg border-0 focus:ring-2 focus:ring-emerald-400 text-sm placeholder-gray-400 shadow-sm"
                    />
                  </div>
                  <button 
                    onClick={() => triggerToast(`Filtered down search!`)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-2 text-sm rounded-lg cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>
            </section>

            {/* Filter Row Categories Belt */}
            <section className="bg-white dark:bg-[#0f1c16] border-b border-emerald-50 dark:border-white/10 shadow-sm sticky top-[58px] z-40">
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex gap-2 overflow-x-auto scrollbar-none select-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full font-semibold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${cat === selectedCategory ? 'bg-emerald-500 text-white shadow-sm' : 'border border-[#c8d6cc]/60 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>

            {/* List Body */}
            <section className="max-w-7xl mx-auto px-4 md:px-8 py-10 w-full flex-1">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex justify-between items-center gap-3">
                <span>Showing <strong className="text-gray-900 dark:text-white font-bold">{filteredCampaigns.length}</strong> campaign{filteredCampaigns.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white dark:bg-[#13251c] dark:text-white text-xs font-bold py-1.5 px-2.5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                  >
                    <option value="default">Sort: Featured</option>
                    <option value="mostFunded">Most Funded</option>
                    <option value="nearlyThere">Nearly There</option>
                    <option value="mostDonors">Most Donors</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
              </div>

              {filteredCampaigns.length === 0 ? (
                <div className="bg-white dark:bg-[#13251c] rounded-xl shadow-xs border border-emerald-50/50 dark:border-white/10 p-12 text-center max-w-lg mx-auto mt-6">
                  <div className="text-4xl mb-4 text-emerald-800 font-bold">🔍</div>
                  <h3 className="font-bold text-gray-800 text-base mb-1">No campaigns matched your request</h3>
                  <p className="text-gray-500 text-xs mb-4">Try clearing your filters or entering a different search term.</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="bg-emerald-500 text-white hover:bg-emerald-400 text-xs font-bold py-2 px-4 rounded-lg shadow-sm"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCampaigns.map((c) => {
                    const percentFunded = Math.round((c.raised / c.target) * 100);
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setSelectedCampaignId(c.id);
                          setDonationSuccess(false);
                          setActivePage('detail');
                        }}
                        className="bg-white dark:bg-[#13251c] rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-emerald-50/70 dark:border-white/10 transition-all hover:-translate-y-1 cursor-pointer flex flex-col h-full"
                      >
                        <div
                          className="py-10 text-center text-5xl select-none relative"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.icon}
                          {canDeleteCampaign(c) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(c);
                              }}
                              title="Delete campaign"
                              className="absolute top-2 right-2 bg-white/80 hover:bg-red-500 text-red-500 hover:text-white p-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-3 text-xs font-bold">
                            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full uppercase tracking-wider">{c.category}</span>
                            {c.verified && (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#145a32] px-2 py-0.5 rounded-full">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Verified
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-gray-900 leading-snug mb-2 group-hover:text-emerald-800 transition-colors line-clamp-2">
                            {c.title}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-6 line-clamp-3">
                            {c.short}
                          </p>

                          <div className="mt-auto space-y-3">
                            <div>
                              <div className="w-full bg-emerald-100/50 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, percentFunded)}%` }} />
                              </div>
                              <div className="flex justify-between items-center text-xs mt-1.5 text-gray-500">
                                <span className="font-bold text-emerald-800">KES {c.raised.toLocaleString()}</span>
                                <span>{percentFunded}% of KES {c.target.toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-emerald-50/50">
                              <span className="text-xs text-gray-500 font-medium">
                                <strong className="text-gray-800 font-bold">{c.donors}</strong> donors
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampaignId(c.id);
                                  setDonationSuccess(false);
                                  setActivePage('detail');
                                }}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs py-1.5 px-3.5 rounded-lg border-0 transition-colors shadow-xs"
                              >
                                Donate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 3. CAMPAIGN DETAIL VIEW */}
        {activePage === 'detail' && activeCampaign && (
          <div className="w-full flex flex-col anim-fade-in">
            {/* Header Hero */}
            <section className="bg-gradient-to-br from-[#0a3d1f] to-[#145a32] text-white py-12 px-4 md:px-8 relative overflow-hidden">
              <div className="max-w-5xl mx-auto relative z-10">
                <button 
                  onClick={() => setActivePage('browse')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-white transition-all cursor-pointer mb-5 uppercase tracking-wider"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to campaigns
                </button>
                
                <div className="flex flex-wrap gap-2.5 mb-4 items-center">
                  <span className="bg-white/10 text-emerald-300 font-bold border border-white/10 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                    {activeCampaign.category}
                  </span>
                  {activeCampaign.verified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-300/20 text-white/90 font-bold px-3 py-1 rounded-full text-xs box-border">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Organisation
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-2xl md:text-4xl font-bold leading-tight max-w-4xl">
                  {activeCampaign.title}
                </h1>
                
                <p className="text-emerald-200 text-sm mt-3 font-medium">
                  Managed transparently by <strong className="text-white font-bold">{activeCampaign.org}</strong>
                </p>
              </div>
            </section>

            {/* Split layout */}
            <section className="max-w-5xl mx-auto px-4 md:px-8 py-10 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column Description */}
              <div className="md:col-span-2 space-y-8">
                
                {/* Visual Icon */}
                <div className="bg-white dark:bg-[#13251c] rounded-xl shadow-xs p-6 border border-emerald-50 dark:border-white/10 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl select-none" style={{ backgroundColor: activeCampaign.color }}>
                    {activeCampaign.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{activeCampaign.org}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Verified NGO Partner · Nairobi Registry Office</p>
                  </div>
                </div>

                {/* About Campaign */}
                <div className="bg-white dark:bg-[#13251c] rounded-xl shadow-xs p-6 border border-emerald-50 dark:border-white/10">
                  <h3 className="font-serif text-[#0a3d1f] dark:text-white font-bold text-lg border-b-2 border-emerald-50 dark:border-white/10 pb-3 mb-4">
                    About This Campaign
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {activeCampaign.desc}
                  </p>
                </div>

                {/* Impact stats grid */}
                <div className="bg-white dark:bg-[#13251c] rounded-xl shadow-xs p-6 border border-emerald-50 dark:border-white/10">
                  <h3 className="font-serif text-[#0a3d1f] dark:text-white font-bold text-lg border-b-2 border-emerald-50 dark:border-white/10 pb-3 mb-4">
                    Impact So Far
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {activeCampaign.impact.map((it, idx) => (
                      <div key={idx} className="bg-emerald-50/50 rounded-xl p-4 text-center border border-emerald-100/30">
                        <div className="text-[#145a32] font-black text-lg md:text-2xl leading-none">{it.num}</div>
                        <div className="text-gray-500 text-[10px] md:text-xs font-bold leading-snug mt-1 uppercase tracking-widest">{it.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial transparency breakdown */}
                <div className="bg-white dark:bg-[#13251c] rounded-xl shadow-xs p-6 border border-emerald-50 dark:border-white/10">
                  <h3 className="font-serif text-[#0a3d1f] dark:text-white font-bold text-lg border-b-2 border-emerald-50 dark:border-white/10 pb-3 mb-4">
                    How Funds Are Used
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed font-medium">
                    {activeCampaign.usage}
                  </p>
                </div>
              </div>

              {/* Right Column Sidebar Widget */}
              <div>
                <div className="bg-white dark:bg-[#13251c] rounded-xl shadow-md border border-emerald-50/80 dark:border-white/10 p-6 sticky top-[90px] space-y-6">
                  
                  {/* Progress Header */}
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#0a3d1f] dark:text-white mb-3">Campaign Progress</h3>
                    <div className="text-3xl font-serif font-black text-emerald-800 leading-none">
                      KES {activeCampaign.raised.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 font-semibold mt-1.5 uppercase">
                      of KES {activeCampaign.target.toLocaleString()} goal
                    </div>
                  </div>

                  {/* Meter graph */}
                  <div>
                    <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, Math.round((activeCampaign.raised / activeCampaign.target) * 100))}%` }} />
                    </div>
                    <div className="text-xs font-bold text-emerald-700 mt-2">
                      {Math.round((activeCampaign.raised / activeCampaign.target) * 100)}% Funded
                    </div>
                  </div>

                  {/* Double micro block */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50/40 border border-emerald-100/30 rounded-lg p-3">
                      <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Donors</div>
                      <div className="text-[#1c2b22] font-bold text-lg mt-0.5">{activeCampaign.donors}</div>
                    </div>
                    <div className="bg-emerald-50/40 border border-emerald-100/30 rounded-lg p-3">
                      <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Remaining</div>
                      <div className="text-[#1c2b22] font-semibold text-xs mt-1.5 text-emerald-900 leading-tight">
                        {activeCampaign.target > activeCampaign.raised ? `KES ${(activeCampaign.target - activeCampaign.raised).toLocaleString()}` : "Fully Funded!"}
                      </div>
                    </div>
                  </div>

                  {/* Donation Actions */}
                  <div className="pt-2 border-t border-emerald-50/80 space-y-4">
                    
                    {donationSuccess ? (
                      <div className="bg-emerald-100/80 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                        <h4 className="font-bold text-[#0a3d1f] text-sm">Donation Confirmed!</h4>
                        <div className="bg-white/70 rounded-lg py-2.5 px-3 border border-emerald-200/60">
                          <div className="text-2xl font-serif font-black text-emerald-800 leading-none">
                            KES {(lastDonation?.amount ?? 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">
                            via {lastDonation?.method || 'M-Pesa Express'}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">
                          Your contribution to <strong className="text-emerald-900">{lastDonation?.campaignTitle || activeCampaign.title}</strong> was securely logged in real-time.
                          {currentUser
                            ? ' It now appears in your contributions ledger.'
                            : ' Log in before donating to track it in your personal ledger.'}
                        </p>
                        <button
                          onClick={() => setDonationSuccess(false)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-500 underline cursor-pointer mt-1"
                        >
                          Donate again
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Select Contribution Amount (KES)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[500, 2000, 5000].map((amt) => (
                            <button
                              key={amt}
                              onClick={() => {
                                setDonationAmount(amt);
                                setCustomAmountStr('');
                              }}
                              className={`py-2 text-xs font-bold rounded-lg border transition-all ${donationAmount === amt && !customAmountStr ? 'bg-[#0a3d1f] text-white border-[#0a3d1f]' : 'border-emerald-100 bg-white hover:bg-emerald-50 text-emerald-900'}`}
                            >
                              {amt.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        {/* Custom Input */}
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">KES</span>
                          <input
                            type="number"
                            placeholder="Other Custom Amount"
                            value={customAmountStr}
                            onChange={(e) => setCustomAmountStr(e.target.value)}
                            className="bg-white text-gray-900 block w-full pl-12 pr-3 py-2 text-xs font-bold rounded-lg border border-emerald-100 focus:outline-[#0a3d1f]"
                          />
                        </div>

                        {/* AI impact explainer */}
                        <button
                          type="button"
                          onClick={() => fetchAiImpact(activeCampaign, customAmountStr ? parseInt(customAmountStr) : donationAmount)}
                          disabled={aiImpactLoading}
                          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 border border-dashed border-emerald-300 hover:bg-emerald-50 rounded-lg py-2 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {aiImpactLoading ? <Activity className="w-3.5 h-3.5 animate-pulse" /> : <Wand2 className="w-3.5 h-3.5" />}
                          {aiImpactLoading ? 'Calculating impact…' : 'Show my impact with AI'}
                        </button>
                        {aiImpactText && (
                          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-100 rounded-lg p-3 flex gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">{aiImpactText}</p>
                          </div>
                        )}

                    {/* Execute */}
                        <button
                          onClick={() => {
                            // default method in this UI section is M-Pesa
                            handleDonateSubmit(activeCampaign.id);
                          }}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-serif font-black py-3 rounded-lg text-sm tracking-wide shadow-md hover:shadow-lg transition-all cursor-pointer select-none active:scale-95"
                        >
                          Send My Donation
                        </button>

                      </div>
                    )}

                    <button
                      onClick={() => handleShareCampaign(activeCampaign)}
                      className="w-full border border-gray-200 bg-transparent text-gray-600 hover:border-emerald-300 hover:text-emerald-800 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Share Campaign Link
                    </button>

                    {/* Management: edit/delete restricted to admins and the owning organisation */}
                    {canDeleteCampaign(activeCampaign) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditCampaign(activeCampaign)}
                          className="flex-1 border border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(activeCampaign)}
                          className="flex-1 border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100 hover:border-red-300 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Defensive fallback: on the detail route with no resolvable campaign
            (e.g. after a deep link), show a recovery card instead of a blank page. */}
        {activePage === 'detail' && !activeCampaign && (
          <div className="flex-1 flex items-center justify-center p-6 anim-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-emerald-50 p-10 text-center max-w-md">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-bold text-gray-800 text-base mb-1">Campaign not available</h3>
              <p className="text-gray-500 text-xs mb-5">This campaign could not be loaded. Head back to browse all active campaigns.</p>
              <button
                onClick={() => { setSelectedCategory('All'); setActivePage('browse'); }}
                className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm cursor-pointer"
              >
                Back to Campaigns
              </button>
            </div>
          </div>
        )}

        {/* 4. AUTHENTICATION LOGIN / REGISTER VIEW */}
        {activePage === 'login' && (
          <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-[#0a3d1f] via-[#145a32] to-[#1a7340] relative overflow-hidden anim-fade-in py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(46,204,113,0.1),transparent)] pointer-events-none" />
            
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 border border-emerald-800/20">
              
              {/* Card Header Splash branding */}
              <div className="bg-[#0a3d1f] text-center p-6">
                <div className="font-serif text-white text-2xl font-bold">
                  Charity<span className="text-[#2ecc71]">Link</span>
                </div>
                <p className="text-emerald-200 text-xs mt-1 leading-relaxed">Verified &amp; Transparent Giving Platform</p>
              </div>

              {/* Toggles */}
              <div className="flex border-b border-emerald-100">
                <button
                  onClick={() => {
                    setAuthTab('login');
                    setErrors({});
                  }}
                  className={`flex-1 text-center py-3 text-sm font-bold transition-all ${authTab === 'login' ? 'text-emerald-800 border-b-2 border-emerald-500 bg-emerald-50/10' : 'text-gray-400 hover:text-gray-600 bg-transparent'}`}
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setAuthTab('register');
                    setErrors({});
                  }}
                  className={`flex-1 text-center py-3 text-sm font-bold transition-all ${authTab === 'register' ? 'text-emerald-800 border-b-2 border-emerald-500 bg-emerald-50/10' : 'text-gray-400 hover:text-gray-600 bg-transparent'}`}
                >
                  Create Account
                </button>
              </div>

              {/* Forms Workspace */}
              <div className="p-6">
                
                {/* 4A. TAB LOG IN */}
                {authTab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#1c2b22]">Email Address</label>
                      <input 
                        type="email" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`bg-white text-gray-950 block w-full px-4 py-2 text-sm rounded-lg border ${errors.loginEmail ? 'border-red-500 focus:outline-red-500' : 'border-gray-200 focus:outline-emerald-500'}`}
                      />
                      {errors.loginEmail && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.loginEmail}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#1c2b22]">Password</label>
                      <input 
                        type="password" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`bg-white text-gray-950 block w-full px-4 py-2 text-sm rounded-lg border ${errors.loginPassword ? 'border-red-500 focus:outline-red-500' : 'border-gray-200 focus:outline-emerald-500'}`}
                      />
                      {errors.loginPassword && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.loginPassword}</p>}
                    </div>

                    <div className="text-right">
                      <button 
                        type="button"
                        onClick={() => triggerToast("Password reset query submitted successfully!")}
                        className="text-emerald-700 hover:text-emerald-500 text-xs font-bold cursor-pointer transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-lg text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      Log In Securely
                    </button>

                    <p className="text-xs text-center text-gray-500 mt-4 leading-normal select-none">
                      New here? Switch to <strong className="text-emerald-700">Create Account</strong> first. Passwords are securely hashed and verified on login.
                    </p>
                  </form>
                )}

                {/* 4B. TAB REGISTER */}
                {authTab === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    
                    {/* Role Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#1c2b22]">Register as a:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['donor', 'organisation', 'admin'] as UserRole[]).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setSelectedRole(role)}
                            className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all text-center flex flex-col items-center gap-1 ${selectedRole === role ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm' : 'bg-white border-gray-200 hover:border-emerald-200 text-gray-500'}`}
                          >
                            <span className="text-base">
                              {role === 'donor' && '🤝'}
                              {role === 'organisation' && '🏢'}
                              {role === 'admin' && '🛡️'}
                            </span>
                            <span className="capitalize">{role}</span>
                          </button>
                        ))}
                      </div>
                      {/* What each role can do */}
                      <p className="text-[10px] text-gray-500 leading-normal bg-emerald-50/40 border border-emerald-100/50 rounded-lg px-2.5 py-1.5">
                        {selectedRole === 'donor' && '🤝 Donors can browse & fund campaigns and track their giving ledger.'}
                        {selectedRole === 'organisation' && '🏢 Organisations can do everything a donor can, plus launch and delete their own campaigns.'}
                        {selectedRole === 'admin' && '🛡️ Admins oversee the whole platform: manage & delete any campaign and view all users and contributions. Requires an access code.'}
                      </p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#1c2b22]">Full Name</label>
                      <input 
                        type="text" 
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Jane Wanjiru"
                        className={`bg-white text-gray-950 block w-full px-4 py-2 text-sm rounded-lg border ${errors.regName ? 'border-red-500 focus:outline-red-500' : 'border-gray-200 focus:outline-emerald-500'}`}
                      />
                      {errors.regName && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.regName}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#1c2b22]">Email Address</label>
                      <input 
                        type="email" 
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="jane.wanjiru@gmail.com"
                        className={`bg-white text-gray-950 block w-full px-4 py-2 text-sm rounded-lg border ${errors.regEmail ? 'border-red-500 focus:outline-red-500' : 'border-gray-200 focus:outline-emerald-500'}`}
                      />
                      {errors.regEmail && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.regEmail}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#1c2b22]">Password</label>
                      <input 
                        type="password" 
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className={`bg-white text-gray-950 block w-full px-4 py-2 text-sm rounded-lg border ${errors.regPassword ? 'border-red-500 focus:outline-red-500' : 'border-gray-200 focus:outline-emerald-500'}`}
                      />
                      {errors.regPassword && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.regPassword}</p>}
                    </div>

                    {/* Admin access code — only shown/required for admin sign-up */}
                    {selectedRole === 'admin' && (
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#1c2b22] flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Admin Access Code
                        </label>
                        <input
                          type="password"
                          value={registerAdminCode}
                          onChange={(e) => setRegisterAdminCode(e.target.value)}
                          placeholder="Enter the administrator access code"
                          className={`bg-white text-gray-950 block w-full px-4 py-2 text-sm rounded-lg border ${errors.regAdminCode ? 'border-red-500 focus:outline-red-500' : 'border-gray-200 focus:outline-emerald-500'}`}
                        />
                        {errors.regAdminCode && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.regAdminCode}</p>}
                        <p className="text-[10px] text-gray-400">Admin privileges are gated behind a shared secret to prevent unauthorised elevation.</p>
                      </div>
                    )}

                    {/* PROFILE LOGO ALIGNMENT - MULTIPART INTEGRATION */}
                    <div className="space-y-2 pt-2 border-t border-emerald-50">
                      <label className="block text-xs font-bold text-[#1c2b22]">Profile Photo (Fit &amp; Crop)</label>
                      <div className="flex items-center gap-4 bg-emerald-50/30 border border-emerald-100/50 p-3 rounded-xl">
                        
                        {/* Circle View (Fitted / Crop status) */}
                        <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-500 overflow-hidden shrink-0 flex items-center justify-center font-bold text-emerald-800 text-lg">
                          {registeredPhotoUrl ? (
                            <img src={registeredPhotoUrl} alt="Prefit preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <UserIcon className="w-6 h-6 text-emerald-600" />
                          )}
                        </div>

                        {/* Interactive trigger */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <label className="inline-flex items-center gap-1.5 bg-white border border-[#c8d6cc]/60 hover:border-emerald-400 text-emerald-800 hover:bg-emerald-50 text-xs font-bold py-1.5 px-3 rounded-lg shadow-xs cursor-pointer select-none">
                            <UploadCloud className="w-4 h-4 text-emerald-600" />
                            Upload &amp; Fit Image
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handlePfpUploadChange(e, 'register')}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-gray-500 leading-normal">
                            Max 60MB. Crop &amp; pan circle fits instantly.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Register button */}
                    <button 
                      type="submit"
                      className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-lg text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      Join CharityLink
                    </button>
                  </form>
                )}

              </div>
            </div>
          </div>
        )}

        {/* 5. USER PROFILE SYSTEM SYSTEM DASHBOARD */}
        {activePage === 'profile' && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 w-full flex-1 flex flex-col anim-fade-in text-gray-800">
            <h1 className="font-serif text-3xl font-bold text-[#0a3d1f] dark:text-white mb-2">My Transparent Stewardship</h1>
            <p className="text-gray-500 text-sm mb-8">Inspect your verified donations ledger and adjust your circle profile photo seamlessly.</p>
            
            {currentUser ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Visual Circle Profile Info Box */}
                <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50/70 dark:border-white/10 text-center flex flex-col items-center">
                  
                  {/* Circle Adjustable frame container */}
                  <div className="relative group">
                    <div className="w-[140px] h-[140px] rounded-full bg-emerald-100 border-4 border-emerald-500 overflow-hidden flex items-center justify-center font-bold text-emerald-800 text-4xl shadow-md">
                      {currentUser.photoUrl ? (
                        <img src={currentUser.photoUrl} alt="Steward" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        currentUser.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Overriding trigger inside the profile circle box */}
                    <label className="absolute bottom-0 right-1 cursor-pointer bg-emerald-600 text-white p-2.5 rounded-full border border-white/60 shadow-lg hover:bg-emerald-500 active:scale-90 transition-all">
                      <Plus className="w-4 h-4 text-white font-bold" />
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handlePfpUploadChange(e, 'profile')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <h2 className="font-serif text-[#0a3d1f] dark:text-white font-bold text-xl mt-5 mb-1">{currentUser.name}</h2>
                  <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-100/30">
                    Verified {currentUser.role}
                  </span>
                  
                  <p className="text-gray-500 text-xs font-mono font-medium truncate w-full px-4 mb-2">{currentUser.email}</p>

                  {/* Donor tier & progress badge */}
                  {(() => {
                    const t = tierFor(currentUser.totalContributed || 0);
                    return (
                      <div className="w-full mt-3 bg-gradient-to-br from-[#0a3d1f] to-[#145a32] rounded-xl p-4 text-white">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl">{t.current.icon}</span>
                          <span className="font-serif font-bold text-sm">{t.current.name}</span>
                        </div>
                        {t.next ? (
                          <>
                            <div className="w-full bg-white/15 rounded-full h-2 mt-3 overflow-hidden">
                              <div className="bg-emerald-400 h-2 rounded-full transition-all duration-700" style={{ width: `${t.progress}%` }} />
                            </div>
                            <p className="text-[10px] text-emerald-200 mt-2 text-center">
                              KES {((t.next.min) - (currentUser.totalContributed || 0)).toLocaleString()} more to reach {t.next.icon} {t.next.name}
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] text-emerald-200 mt-2 text-center">Highest tier reached — thank you for your generosity! 🎉</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Adjust photo trigger specifically */}
                  <div className="w-full pt-4 mt-4 border-t border-emerald-50 flex flex-col gap-2">
                    <label className="w-full text-center block bg-transparent border border-emerald-100 font-bold text-xs py-2 px-3 rounded-lg text-emerald-800 hover:bg-emerald-50 cursor-pointer select-none transition-all">
                      Adjust/Change Photo (Max 60MB)
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handlePfpUploadChange(e, 'profile')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Micro Stewardship highlights */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-6">
                    <div className="bg-emerald-50/40 rounded-xl p-3 text-center border border-emerald-50/30">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Given</span>
                      <strong className="block text-emerald-800 font-bold text-sm mt-1">KES {(currentUser.totalContributed || 0).toLocaleString()}</strong>
                    </div>
                    <div className="bg-emerald-50/40 rounded-xl p-3 text-center border border-emerald-50/30">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Task links</span>
                      <strong className="block text-emerald-800 font-bold text-sm mt-1">{currentUser.campaignsSupported || 0}</strong>
                    </div>
                    <div className="bg-emerald-50/40 rounded-xl p-3 text-center border border-emerald-50/30">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Joined</span>
                      <strong className="block text-emerald-800 font-bold text-xs mt-1.5">{currentUser.memberSince || 'June 2026'}</strong>
                    </div>
                  </div>
                </div>

                {/* Dashboard Ledger Ledger list */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Quick Overview Stewardship Summary */}
                  <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50/70 dark:border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-[#0a3d1f]">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-serif font-bold text-base">Verified Impact Statement</h3>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed font-semibold">
                      Your contributions are aligned with zero-commission water and healthcare grids. No platform fees are withheld from grassroot organizations. We publish real-time ledger outputs matching local county registries.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="flex items-start gap-3 bg-[#eafaf1]/40 border border-[#eafaf1] p-3 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950">Active Safeguards</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Bi-annual audits trace borehole installation parameters matching GPS references.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-[#e8f4fd]/50 border border-[#e8f4fd] p-3 rounded-xl">
                        <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-blue-950">Pacer Level: Active Guardian</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Unlocked transparency certificates tracing secure digital handshakes on Maji Safi.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Giving Insights */}
                  {myContributions.length > 0 && (() => {
                    const byCat: Record<string, number> = {};
                    for (const c of myContributions) byCat[c.category] = (byCat[c.category] || 0) + c.amount;
                    const data = Object.entries(byCat).map(([label, value]) => ({ label, value, color: categoryColor(label, darkMode) }));
                    return (
                      <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50/70 dark:border-white/10">
                        <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base border-b border-emerald-50 dark:border-white/10 pb-3 mb-5 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-600" /> Your Giving Breakdown
                        </h3>
                        <DonutChart data={data} centerLabel="You gave" formatValue={(n) => formatKES(n)} />
                      </div>
                    );
                  })()}

                  {/* Sample Mock Activity Log ledger table */}
                  <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50/70 dark:border-white/10">
                    <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base border-b border-emerald-50 dark:border-white/10 pb-3 mb-4">
                      My Contributions Ledger
                    </h3>

                    {myContributions && myContributions.length > 0 ? (
                      <div className="relative overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-emerald-50 text-gray-400 uppercase tracking-widest font-sans font-bold">
                              <th className="py-2.5 font-bold">Project Ref</th>
                              <th className="py-2.5 font-bold">Category</th>
                              <th className="py-2.5 font-bold">Method</th>
                              <th className="py-2.5 font-bold text-right text-[#0a3d1f]">Amount (KES)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-5/40 font-medium">
                            {myContributions.map((c) => (
                              <tr key={c.id} className="border-b border-emerald-50">
                                <td className="py-3 text-gray-900 dark:text-gray-100 font-bold">{c.campaignTitle}</td>
                                <td className="py-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    c.category === 'Water' ? 'bg-blue-50 text-blue-800' :
                                    c.category === 'Education' ? 'bg-amber-50 text-amber-800' :
                                    c.category === 'Health' ? 'bg-pink-50 text-pink-800' :
                                    c.category === 'Livelihood' ? 'bg-emerald-50 text-emerald-800' :
                                    c.category === 'Emergency' ? 'bg-orange-50 text-orange-800' :
                                    'bg-[#e8f8f5] text-emerald-900'
                                  }`}>
                                    {c.category}
                                  </span>
                                </td>
                                <td className="py-3 font-mono text-gray-500">{c.paymentMethod}</td>
                                <td className="py-3 text-right font-bold text-emerald-800">KES {c.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <FolderHeart className="w-10 h-10 text-emerald-100 mx-auto mb-2" />
                        <h4 className="font-bold text-xs">No donations recorded yet on this account</h4>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">Explore campaigns and send a donation to see your transparent impact statement populate here instantly!</p>
                      </div>
                    )}
                  </div>

                  {/* ORGANISATION PANEL — manage your own campaigns */}
                  {role === 'organisation' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50/70">
                      <div className="flex items-center justify-between border-b border-emerald-50 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-emerald-600" />
                          <h3 className="font-serif font-bold text-[#0a3d1f] text-base">My Campaigns</h3>
                        </div>
                        <button
                          onClick={() => {
                            setEditingCampaignId(null);
                            setNcTitle(''); setNcOrg(''); setNcDesc(''); setNcShort(''); setNcTarget('300000');
                            setNcSuccess(false); setShowStartCampaignModal(true);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> New
                        </button>
                      </div>

                      {myOwnedCampaigns.length > 0 ? (
                        <div className="space-y-3">
                          {myOwnedCampaigns.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-50 hover:border-emerald-100 transition-colors">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: c.color }}>{c.icon}</div>
                              <div className="flex-1 min-w-0">
                                <button onClick={() => { setSelectedCampaignId(c.id); setDonationSuccess(false); setActivePage('detail'); }} className="font-bold text-xs text-gray-900 dark:text-white truncate hover:text-emerald-700 text-left w-full cursor-pointer">{c.title}</button>
                                <div className="text-[10px] text-gray-500 mt-0.5">KES {c.raised.toLocaleString()} raised · {c.donors} donors · {Math.round((c.raised / c.target) * 100)}% funded</div>
                              </div>
                              <button
                                onClick={() => handleOpenEditCampaign(c)}
                                title="Edit campaign"
                                className="text-emerald-600 hover:text-white hover:bg-emerald-500 p-2 rounded-lg transition-colors cursor-pointer shrink-0"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(c)}
                                title="Delete campaign"
                                className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-gray-500">
                          <Briefcase className="w-9 h-9 text-emerald-100 mx-auto mb-2" />
                          <h4 className="font-bold text-xs">You haven't launched any campaigns yet</h4>
                          <p className="text-[10px] text-gray-400 mt-1">Click “New” to publish your first verified campaign.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ADMIN CONTROL CENTER — full platform oversight */}
                  {role === 'admin' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-[#0a3d1f] to-[#145a32] text-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <ShieldAlert className="w-5 h-5 text-emerald-300" />
                          <h3 className="font-serif font-bold text-base">Admin Control Center</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                            <div className="text-lg font-black">{campaigns.length}</div>
                            <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">Campaigns</div>
                          </div>
                          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                            <div className="text-lg font-black">{adminUsers.length}</div>
                            <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">Users</div>
                          </div>
                          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                            <div className="text-lg font-black">{adminContributions.length}</div>
                            <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">Donations</div>
                          </div>
                          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                            <div className="text-lg font-black">{formatKES(totalRaised)}</div>
                            <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">Raised</div>
                          </div>
                        </div>
                      </div>

                      {/* Admin analytics charts */}
                      {analytics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50/70 dark:border-white/10">
                            <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-4">Raised by Category</h3>
                            <DonutChart
                              size={170} thickness={22}
                              data={analytics.byCategory.map((c: any) => ({ label: c.label, value: c.value, color: categoryColor(c.label, darkMode) }))}
                              centerLabel="Raised"
                              formatValue={(n) => formatKES(n)}
                            />
                          </div>
                          <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50/70 dark:border-white/10">
                            <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-4">Donations Over Time</h3>
                            <AreaChart
                              height={170}
                              points={analytics.overTime.map((p: any) => ({ label: p.date, value: p.amount }))}
                              color={darkMode ? '#34d399' : '#10b981'}
                              formatValue={(n) => formatKES(n)}
                              formatLabel={(s) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                          </div>
                        </div>
                      )}

                      {/* Manage all campaigns */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50/70">
                        <h3 className="font-serif font-bold text-[#0a3d1f] text-base border-b border-emerald-50 pb-3 mb-4 flex items-center gap-2">
                          <Layers className="w-5 h-5 text-emerald-600" /> Manage All Campaigns
                        </h3>
                        <div className="space-y-2">
                          {campaigns.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-emerald-50">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: c.color }}>{c.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-xs text-gray-900 dark:text-white truncate">{c.title}</div>
                                <div className="text-[10px] text-gray-500">{c.org}{c.ownerEmail ? ` · ${c.ownerEmail}` : ' · platform'}</div>
                              </div>
                              <button onClick={() => handleOpenEditCampaign(c)} title="Edit campaign" className="text-emerald-600 hover:text-white hover:bg-emerald-500 p-2 rounded-lg transition-colors cursor-pointer shrink-0">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteCampaign(c)} title="Delete campaign" className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors cursor-pointer shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* All registered users */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50/70">
                        <h3 className="font-serif font-bold text-[#0a3d1f] text-base border-b border-emerald-50 pb-3 mb-4 flex items-center gap-2">
                          <Users2 className="w-5 h-5 text-emerald-600" /> Registered Users ({adminUsers.length})
                        </h3>
                        <div className="relative overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-emerald-50 text-gray-400 uppercase tracking-widest font-bold">
                                <th className="py-2 font-bold">Name</th>
                                <th className="py-2 font-bold">Email</th>
                                <th className="py-2 font-bold">Role</th>
                                <th className="py-2 font-bold text-right">Given (KES)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {adminUsers.map((u) => (
                                <tr key={u.email} className="border-b border-emerald-50">
                                  <td className="py-2.5 font-bold text-gray-900">{u.name}</td>
                                  <td className="py-2.5 font-mono text-gray-500 truncate max-w-[140px]">{u.email}</td>
                                  <td className="py-2.5">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 capitalize font-bold">{u.role}</span>
                                  </td>
                                  <td className="py-2.5 text-right font-bold text-emerald-800">{(u.totalContributed || 0).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#13251c] p-12 text-center rounded-xl max-w-lg mx-auto border border-emerald-50 dark:border-white/10">
                <p className="text-gray-500 text-sm mb-4">Please log in to inspect your secure stewardship log.</p>
                <button 
                  onClick={() => {
                    setAuthTab('login');
                    setActivePage('login');
                  }}
                  className="bg-emerald-500 text-white font-bold py-2 px-5 rounded-lg text-xs"
                >
                  Log In
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. IMPACT ANALYTICS DASHBOARD */}
        {activePage === 'analytics' && (
          <div className="w-full flex flex-col anim-fade-in">
            {/* Header */}
            <section className="bg-gradient-to-br from-[#0a3d1f] via-[#145a32] to-[#1a7340] text-white py-12 px-4 md:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="inline-flex items-center gap-1.5 bg-emerald-800/50 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-300 uppercase tracking-widest mb-4">
                  <BarChart3 className="w-4 h-4" /> Live Transparency Analytics
                </div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold">Impact & Insights Dashboard</h1>
                <p className="text-emerald-100/90 text-sm mt-2 max-w-2xl">Real-time, aggregated data across every verified campaign — the same numbers our compliance team publishes.</p>
              </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 md:px-8 py-10 w-full space-y-8">
              {analytics ? (
                <>
                  {/* KPI tiles */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Raised', value: formatKES(analytics.totals.raised), icon: <TrendingUp className="w-5 h-5" /> },
                      { label: 'Contributions', value: analytics.totals.contributions.toLocaleString(), icon: <Heart className="w-5 h-5" /> },
                      { label: 'Active Campaigns', value: analytics.totals.campaigns, icon: <Layers className="w-5 h-5" /> },
                      { label: 'Registered Donors', value: analytics.totals.users.toLocaleString(), icon: <Users2 className="w-5 h-5" /> },
                    ].map((k, i) => (
                      <div key={i} className="bg-white dark:bg-[#13251c] rounded-2xl p-5 shadow-sm border border-emerald-50 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">{k.icon}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{k.label}</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-[#0a3d1f] dark:text-white mt-3">{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Row: category donut + top campaigns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50 dark:border-white/10">
                      <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-5">Funds Raised by Category</h3>
                      <DonutChart
                        data={analytics.byCategory.map((c: any) => ({ label: c.label, value: c.value, color: categoryColor(c.label, darkMode) }))}
                        centerLabel="Raised"
                        formatValue={(n) => formatKES(n)}
                      />
                    </div>
                    <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50 dark:border-white/10">
                      <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-5">Top Campaigns</h3>
                      <HBarChart
                        data={analytics.topCampaigns.map((c: any) => ({
                          label: `${c.icon} ${c.title}`,
                          value: c.raised,
                          sub: `${Math.round((c.raised / c.target) * 100)}% of ${formatKES(c.target)} goal`,
                          color: '#10b981'
                        }))}
                        formatValue={(n) => formatKES(n)}
                      />
                    </div>
                  </div>

                  {/* Row: donations over time */}
                  <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50 dark:border-white/10">
                    <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-5">Donations Over Time</h3>
                    <AreaChart
                      points={analytics.overTime.map((p: any) => ({ label: p.date, value: p.amount }))}
                      color={darkMode ? '#34d399' : '#10b981'}
                      formatValue={(n) => formatKES(n)}
                      formatLabel={(s) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                  </div>

                  {/* Row: leaderboard + payment split + live feed */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Leaderboard */}
                    <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50 dark:border-white/10">
                      <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" /> Top Donors
                      </h3>
                      {leaderboard.length > 0 ? (
                        <div className="space-y-2.5">
                          {leaderboard.slice(0, 6).map((u: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                                i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-700 dark:bg-white/10 dark:text-emerald-300'
                              }`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                                {u.photoUrl ? <img src={u.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{u.name}</div>
                                <div className="text-[10px] text-gray-400">{u.tier?.icon} {u.tier?.name}</div>
                              </div>
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">{formatKES(u.totalContributed)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 py-6 text-center">No donors ranked yet.</p>
                      )}
                    </div>

                    {/* Payment method split */}
                    <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50 dark:border-white/10">
                      <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-4">Payment Methods</h3>
                      <DonutChart
                        size={160}
                        thickness={22}
                        data={analytics.byMethod.map((m: any, i: number) => ({ label: m.label, value: m.value, color: methodColors[i % methodColors.length] }))}
                        centerLabel="Payments"
                        formatValue={(n) => `${n}`}
                      />
                    </div>

                    {/* Live activity feed */}
                    <div className="bg-white dark:bg-[#13251c] rounded-2xl p-6 shadow-sm border border-emerald-50 dark:border-white/10">
                      <h3 className="font-serif font-bold text-[#0a3d1f] dark:text-white text-base mb-4 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        Live Activity
                      </h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {activityFeed.length > 0 ? activityFeed.map((a: any, i: number) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: `${categoryColor(a.category, darkMode)}22` }}>
                              <Heart className="w-3 h-3" style={{ color: categoryColor(a.category, darkMode) }} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-700 dark:text-gray-200 leading-snug">
                                <strong className="text-gray-900 dark:text-white">{a.donorName}</strong> gave <strong className="text-emerald-700 dark:text-emerald-400">{formatKES(a.amount)}</strong> to <span className="font-semibold">{a.campaignTitle}</span>
                              </p>
                              <span className="text-[10px] text-gray-400">{timeAgo(a.timestamp)} · {a.paymentMethod}</span>
                            </div>
                          </div>
                        )) : <p className="text-xs text-gray-400 py-6 text-center">No recent activity.</p>}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-gray-400 text-sm">Loading analytics…</div>
              )}
            </section>
          </div>
        )}

      </main>

      {/* ── FOOTER SYSTEM ── */}
      <footer className="bg-[#0a3d1f] text-emerald-200 text-xs py-8 px-4 border-t border-emerald-950 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="font-serif text-white font-bold text-base mb-1">
              Charity<span className="text-[#2ecc71]">Link</span>
            </div>
            <p className="text-emerald-300 font-medium">Empowering local communities with 100% verified, zero-commission giving frameworks.</p>
          </div>
          <div className="text-emerald-300 font-semibold select-none text-center md:text-right">
            © 2026 CharityLink · Transparent Giving Platform
          </div>
        </div>
      </footer>

      {/* ── CONFETTI CELEBRATION ── */}
      {showConfetti && <Confetti />}

      {/* ── TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toast && toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-[#145a32] text-white px-5 py-3.5 rounded-xl text-xs font-bold shadow-xl border border-emerald-500/30 flex items-center gap-2.5 z-[9999]"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── START CAMPAIGN MODAL ── */}
      <AnimatePresence>
        {showStartCampaignModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStartCampaignModal(false)}
              className="fixed inset-0 bg-[#06200f]/80 backdrop-blur-sm"
            />

            {/* Content Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden flex flex-col max-h-[90vh] z-10"
              id="start-campaign-modal"
            >
              {/* Header */}
              <div className="bg-[#0a3d1f] text-white px-6 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
                    <Plus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold">{editingCampaignId !== null ? 'Edit Campaign' : 'Launch a Verified Campaign'}</h3>
                    <p className="text-emerald-300 text-[10px] font-semibold">{editingCampaignId !== null ? 'Update the details of your campaign' : 'Zero application or operational fees on CharityLink Kenya'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowStartCampaignModal(false)}
                  className="text-emerald-100 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {ncSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                      <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-serif text-[#0a3d1f] font-bold text-xl">Campaign Launched Successfully!</h4>
                      <p className="text-gray-500 text-xs max-w-md mx-auto leading-relaxed">
                        Your campaign is now live on our database and readable by our compliance team. Donors will see it on the explore grid immediately!
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setNcSuccess(false);
                        setShowStartCampaignModal(false);
                        setSelectedCategory('All');
                        setActivePage('browse');
                      }}
                      className="inline-flex items-center justify-center bg-[#0a3d1f] hover:bg-[#145a32] text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      View Campaigns Grid
                    </button>
                  </div>
                ) : (
                  <form onSubmit={editingCampaignId !== null ? handleUpdateCampaign : handleCreateCampaign} className="space-y-5">

                    {/* Two Col Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Organization Name */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Organization / Trust Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Msitu wa Kenya or Afya Foundation"
                          value={ncOrg}
                          onChange={(e) => setNcOrg(e.target.value)}
                          className="w-full bg-gray-50 text-sm py-2.5 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                        />
                      </div>

                      {/* Campaign Title */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Campaign Title</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Reforesting the Aberdare Range"
                          value={ncTitle}
                          onChange={(e) => setNcTitle(e.target.value)}
                          className="w-full bg-gray-50 text-sm py-2.5 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                        />
                      </div>
                    </div>

                    {/* Brief Elevator Pitch */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Elevator Pitch (Short Description)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Provide a 1-sentence catchy overview of your target goals."
                        value={ncShort}
                        onChange={(e) => setNcShort(e.target.value)}
                        className="w-full bg-gray-50 text-sm py-2.5 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                      />
                    </div>

                    {/* AI copywriter assist */}
                    <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Wand2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-900">AI Campaign Assistant</p>
                          <p className="text-[10px] text-gray-500 truncate">Type a short idea above, then auto-draft the full description.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateCopy}
                        disabled={aiCopyLoading}
                        className="shrink-0 bg-[#0a3d1f] hover:bg-[#145a32] text-white text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
                      >
                        {aiCopyLoading ? <Activity className="w-4 h-4 animate-pulse" /> : <Sparkles className="w-4 h-4" />}
                        {aiCopyLoading ? 'Writing…' : 'Generate'}
                      </button>
                    </div>

                    {/* Full Breakdown Desc */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Full Campaign Context & Impact Needs</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Detail why funding this project matters, what local county challenges this fixes, and your transparent implementation milestones."
                        value={ncDesc}
                        onChange={(e) => setNcDesc(e.target.value)}
                        className="w-full bg-gray-50 text-sm py-2.5 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium resize-none text-[#1c2b22]"
                      />
                    </div>

                    {/* Grid Selection Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Fund target */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-sans">Target Goal (KES)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs text-gray-500 font-bold">KES</span>
                          <input 
                            type="number" 
                            required
                            min="1000"
                            placeholder="300000"
                            value={ncTarget}
                            onChange={(e) => setNcTarget(e.target.value)}
                            className="w-full bg-gray-50 text-sm py-2.5 pl-12 pr-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-[#1c2b22]"
                          />
                        </div>
                      </div>

                      {/* Category SELECT */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Category</label>
                        <select 
                          value={ncCategory}
                          onChange={(e) => setNcCategory(e.target.value)}
                          className="w-full bg-gray-50 text-sm py-2.5 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-[#1c2b22]"
                        >
                          <option value="Water">Water Irrigation</option>
                          <option value="Education">Bursary & Education</option>
                          <option value="Health">Maternal & General Health</option>
                          <option value="Livelihood">Youth Agri-Business</option>
                          <option value="Emergency">Disaster Emergency Relief</option>
                          <option value="Environment">Environmental Stewardship</option>
                        </select>
                      </div>

                      {/* Select Associated Emoji */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Display Icon</label>
                        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
                          {['💧', '📚', '🏥', '🌱', '🌳', '🆘', '🏫', '🌾'].map((emoji) => (
                            <button 
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setNcIcon(emoji);
                                // Sync pre-set palette color
                                if (emoji === '💧') setNcColor('#e8f4fd');
                                else if (emoji === '📚' || emoji === '🏫') setNcColor('#fef9e7');
                                else if (emoji === '🏥') setNcColor('#fdf2f8');
                                else if (emoji === '🌱' || emoji === '🌾') setNcColor('#eafaf1');
                                else if (emoji === '🆘') setNcColor('#fef5e7');
                                else setNcColor('#e8f8f5');
                              }}
                              className={`py-1 rounded-lg transition-all text-sm text-center select-none cursor-pointer ${ncIcon === emoji ? 'bg-white shadow scale-110 border border-emerald-300 font-bold' : 'hover:bg-white/50'}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-semibold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Requires community audit within 48 hours</span>
                      </div>
                      <button
                        type="submit"
                        className="bg-[#0a3d1f] hover:bg-[#145a32] text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        {editingCampaignId !== null ? 'Save Changes' : 'Publish Verified Campaign'}
                      </button>
                    </div>

                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── HOW IT WORKS DETAILS WALKTHROUGH MODAL ── */}
      <AnimatePresence>
        {showHowItWorksModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHowItWorksModal(false)}
              className="fixed inset-0 bg-[#06200f]/80 backdrop-blur-sm"
            />

            {/* Content Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden flex flex-col z-10 text-[#1c2b22]"
              id="how-it-works-modal"
            >
              {/* Top Banner Accent */}
              <div className="bg-gradient-to-r from-[#0a3d1f] to-[#145a32] text-white px-6 py-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-400/30">
                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold">How CharityLink Works</h3>
                    <p className="text-emerald-300 text-[10px] font-semibold">Decentralized, on-the-ground verification & micro-ledgers</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHowItWorksModal(false)}
                  className="text-emerald-100 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Walkthrough Pillars */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Intro paragraph */}
                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed font-semibold">
                  We designed a trust system to clear out the opacity of typical NGO organizations. Through physical audits and direct transaction tracking, your money behaves like a direct cash injection.
                </p>

                {/* Vertical Process Steps */}
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Physical Verification Step</h4>
                      <p className="text-gray-500 text-xs leading-relaxed mt-0.5">
                        Before any campaign listed in Marsabit, Kibera, or Turkana is published, independent compliance volunteers visit on-site. They register coordinates, take inventory, and ensure validity of the request.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-800 font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Incremental Micro-Installment Disbursal</h4>
                      <p className="text-gray-500 text-xs leading-relaxed mt-0.5">
                        To lock in transparency, donations are not transferred as a single bulk lump-sum. Instead, funds are disbursed incrementally to contractors based on verified photos and invoice submissions.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-100 shrink-0">3</div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">The Real-Time Transparency Ledger</h4>
                      <p className="text-gray-500 text-xs leading-relaxed mt-0.5">
                        Every single contribution is publicly visible on our database ledger. Logged-in donors are provided direct email alerts with photo links showing borehole pressure readouts or classroom receipt copies.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Highlight Stats Banner */}
                <div className="bg-[#eafaf1] border border-emerald-100/50 p-4 rounded-xl flex items-center gap-3 mt-4 text-[#1c2b22]">
                  <ShieldCheck className="w-8 h-8 text-emerald-700 shrink-0" />
                  <div className="text-xs">
                    <strong className="text-emerald-950 font-bold block">95% Direct Field Allocation Guaranteed</strong>
                    <span className="text-gray-500 block">The remaining 5% supports regional volunteer travel and on-the-ground coordinate logging.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => setShowHowItWorksModal(false)}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
                  >
                    Close Walkthrough
                  </button>
                  <button 
                    onClick={() => {
                      setShowHowItWorksModal(false);
                      setSelectedCategory('All');
                      setActivePage('browse');
                    }}
                    className="bg-[#0a3d1f] text-white hover:bg-[#145a32] font-bold text-xs py-2 px-5 rounded-xl transition-all cursor-pointer"
                  >
                    See Active Campaigns
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── QUICK INTERACTIVE DONATION SELECTION MODAL ── */}
      <AnimatePresence>
        {showQuickDonateModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickDonateModal(false)}
              className="fixed inset-0 bg-[#06200f]/80 backdrop-blur-sm"
            />

            {/* Content Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-emerald-50 overflow-hidden flex flex-col z-10 text-[#1c2b22]"
              id="quick-donate-modal"
            >
              {/* Header */}
              <div className="bg-[#0a3d1f] text-white px-6 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
                    <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold">Quick Donation Portal</h3>
                    <p className="text-emerald-300 text-[10px] font-semibold">Immediate on-the-ground microgrid funding prompt</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowQuickDonateModal(false)}
                  className="text-emerald-100 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 md:p-8">
                {qdSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                      <Sparkles className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-serif text-[#0a3d1f] font-bold text-xl">Payment Cleared Successfully!</h4>
                      {lastDonation && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl py-3 px-4 max-w-xs mx-auto">
                          <div className="text-2xl font-serif font-black text-emerald-800 leading-none">KES {lastDonation.amount.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">to {lastDonation.campaignTitle} · {lastDonation.method}</div>
                        </div>
                      )}
                      <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed mt-1">
                        Your support has been linked and logged into your ledger statement instantly! Check your profile to inspect the receipts.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setQdSuccess(false);
                        setShowQuickDonateModal(false);
                        setActivePage('profile');
                      }}
                      className="bg-[#0a3d1f] hover:bg-[#145a32] text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      View My Contributions Ledger
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleQuickDonateSubmit} className="space-y-5">
                    
                    {/* Select active campaign */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Select Campaign to Fund</label>
                      <select 
                        required
                        value={qdCampaignId}
                        onChange={(e) => setQdCampaignId(e.target.value)}
                        className="w-full bg-gray-50 text-xs py-2.5 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-[#1c2b22]"
                      >
                        <option value="" disabled>-- Which grassroot initiative would you like to support? --</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} [{c.category}] {c.title} — (KES {c.raised.toLocaleString()} raised)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick amount chips selection */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Choose Contribution Amount (KES)</label>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[1000, 5000, 10000, 25000].map((amt) => (
                          <button 
                            key={amt}
                            type="button"
                            onClick={() => {
                              setQdAmount(amt);
                              setQdCustomStr('');
                            }}
                            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all border cursor-pointer text-center ${qdAmount === amt && !qdCustomStr ? 'bg-[#0a3d1f] text-white border-[#0a3d1f] shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                          >
                            KES {amt.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-gray-500 font-bold">Custom KES</span>
                        <input 
                          type="number"
                          min="10"
                          placeholder="Or enter any custom amount..."
                          value={qdCustomStr}
                          onChange={(e) => {
                            setQdCustomStr(e.target.value);
                            setQdAmount(0); // clear selected chip highlight
                          }}
                          className="w-full bg-gray-50 text-sm py-2 px-3.5 pl-24 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold"
                        />
                      </div>
                    </div>

                    {/* Personal Coordinates (Optional / prefilled if logged in) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Name (or Anonymous)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Kiprop Cheruiyot"
                          value={qdName}
                          onChange={(e) => setQdName(e.target.value)}
                          className="w-full bg-gray-50 text-sm py-2 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Email</label>
                        <input 
                          type="email" 
                          placeholder="e.g. kiprop@example.com"
                          value={qdEmail}
                          onChange={(e) => setQdEmail(e.target.value)}
                          className="w-full bg-gray-50 text-sm py-2 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                        />
                      </div>
                    </div>

                    {/* Payment choice selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-sans">Gateway</label>
                        <select 
                          value={qdMethod}
                          onChange={(e) => setQdMethod(e.target.value)}
                          className="w-full bg-gray-50 text-sm py-2.5 px-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-[#1c2b22]"
                        >
                          <option value="M-Pesa Express">M-Pesa Express Sim Prompt</option>
                          <option value="Credit / Debit Card">International Visa / Master Card</option>
                          <option value="Secure Digital Wallet">Digital Wallet (Zero-commission)</option>
                        </select>
                      </div>

                      {/* Phone verification only if M-Pesa is selected */}
                      {qdMethod === 'M-Pesa Express' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 text-emerald-800 font-bold">M-Pesa Mobile Number</label>
                          <input 
                            type="tel"
                            required
                            placeholder="e.g. 0712345678"
                            value={qdPhone}
                            onChange={(e) => setQdPhone(e.target.value)}
                            className="w-full bg-emerald-50/50 text-sm py-2 px-3.5 border border-emerald-350/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-[#1c2b22]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Submit Gateway Trigger */}
                    <div className="pt-4 border-t border-gray-100">
                      <button 
                        type="submit"
                        disabled={qdIsLoading}
                        className="w-full bg-[#10b981] hover:bg-emerald-400 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {qdIsLoading ? (
                          <>
                            <Activity className="w-5 h-5 animate-pulse shrink-0 text-emerald-100" />
                            <span>Interfacing Safaricom Gateway...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-emerald-100 shrink-0" />
                            <span>Authorize Secure Contribution (KES {(qdCustomStr ? parseInt(qdCustomStr) : qdAmount).toLocaleString()})</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DONATION RECEIPT POPUP (shown after a successful contribution) ── */}
      <AnimatePresence>
        {showReceiptModal && lastDonation && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReceiptModal(false)}
              className="fixed inset-0 bg-[#06200f]/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden z-10 text-center"
            >
              {/* Close */}
              <button
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-emerald-900 hover:bg-emerald-50 p-1.5 rounded-full transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Success banner */}
              <div className="bg-gradient-to-br from-[#0a3d1f] to-[#145a32] pt-8 pb-10 px-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
                  className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg border-4 border-white/20"
                >
                  <Check className="w-8 h-8 text-white" strokeWidth={3} />
                </motion.div>
                <h3 className="font-serif text-white text-xl font-bold mt-4">Donation Sent!</h3>
                <p className="text-emerald-200 text-xs mt-1">Your contribution was securely recorded.</p>
              </div>

              {/* Receipt body */}
              <div className="px-6 py-6 -mt-5">
                <div className="bg-white rounded-xl shadow-md border border-emerald-100 p-5">
                  <div className="text-3xl font-serif font-black text-emerald-800 leading-none">
                    KES {lastDonation.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Amount Donated</div>

                  <div className="border-t border-dashed border-emerald-100 my-4" />

                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[11px] text-gray-500 font-semibold shrink-0">Campaign</span>
                      <span className="text-xs text-gray-900 font-bold text-right truncate">{lastDonation.campaignTitle}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[11px] text-gray-500 font-semibold shrink-0">Method</span>
                      <span className="text-xs text-emerald-800 font-bold">{lastDonation.method}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[11px] text-gray-500 font-semibold shrink-0">Status</span>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
                  {currentUser
                    ? 'This contribution now appears in your transparent ledger.'
                    : 'Log in before donating to track contributions in your personal ledger.'}
                </p>

                <button
                  onClick={downloadReceipt}
                  className="w-full mt-5 border border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download Receipt
                </button>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => {
                        setShowReceiptModal(false);
                        setActivePage('profile');
                      }}
                      className="flex-1 bg-[#0a3d1f] hover:bg-[#145a32] text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      View My Ledger
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── IMAGE CROPPER TOOL COMPONENT MODAL (Triggered whenever a raw photo is loaded) ── */}
      {cropperSource && (
        <ImageCropper 
          imageUrl={cropperSource}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}

    </div>
  );
}

// Icon fallbacks for profile ledger list
function FolderHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2.5" />
      <path d="M19 14c1.49-1.46 3-1.46 4.5 0 1.5 1.46 0 3.5-3 5.5-3-2-4.5-4.04-3-5.5z" />
    </svg>
  );
}

// Lightweight confetti burst — self-contained, no dependencies.
function Confetti() {
  const colors = ['#2ecc71', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7', '#eab308'];
  const pieces = Array.from({ length: 70 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const duration = 2.4 + Math.random() * 1.6;
    const size = 6 + Math.random() * 8;
    const color = colors[i % colors.length];
    const rounded = Math.random() > 0.5;
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          top: 0,
          left: `${left}%`,
          width: `${size}px`,
          height: `${size * (rounded ? 1 : 0.5)}px`,
          backgroundColor: color,
          borderRadius: rounded ? '50%' : '2px',
          animation: `confetti-fall ${duration}s ${delay}s linear forwards`,
        }}
      />
    );
  });
  return (
    <div className="fixed inset-0 pointer-events-none z-[10001] overflow-hidden" aria-hidden="true">
      {pieces}
    </div>
  );
}