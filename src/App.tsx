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
  Activity
} from 'lucide-react';
import { Campaign, User, UserRole, ImpactItem } from './types';
import { INITIAL_CAMPAIGNS, CATEGORIES } from './data';
import ImageCropper from './components/ImageCropper';
import { motion, AnimatePresence } from 'motion/react';

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

  const [activePage, setActivePage] = useState<'home' | 'browse' | 'detail' | 'login' | 'profile'>(() => {
    // Sync starting view with current user existence or simple routing
    const path = window.location.hash.replace('#', '');
    if (['home', 'browse', 'detail', 'login', 'profile'].includes(path)) {
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

  // Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Toast Alerts
  const [toast, setToast] = useState<{ message: string; show: boolean } | null>(null);

  // Sync hashes for a nice bookmarkable app experience
  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]);

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
    } else {
      setMyContributions([]);
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
          color: ncColor
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

    try {
      if (qdMethod === 'M-Pesa Express') {
        // Trigger STK Push (sandbox) and wait briefly for callback to land.
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
          return;
        }

        triggerToast(`M-Pesa prompt sent. Authorize on your phone to complete payment.`);
        // Give Safaricom time to call callback (sandbox is quick but async).
        setQdIsLoading(true);
        setTimeout(async () => {
          try {
            await fetchCampaigns();
            if (currentUser) {
              await fetchMyContributions(currentUser.email);
              setCurrentUser(prev => prev ? {
                ...prev,
                totalContributed: (prev.totalContributed || 0) + finalAmount,
                campaignsSupported: (prev.campaignsSupported || 0) + 1
              } : null);
            }
            setQdSuccess(true);
            setQdCustomStr('');
            triggerToast(`Thank you! KES ${finalAmount.toLocaleString()} recorded! 🎉`);
          } catch {
            triggerToast('STK push initiated, but ledger update may still be pending.');
          } finally {
            setQdIsLoading(false);
          }
        }, 6000);
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
              setQdSuccess(true);
              setQdCustomStr('');
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
          photoUrl: registeredPhotoUrl
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
        await fetchCampaigns();
        if (currentUser) {
          await fetchMyContributions(currentUser.email);
          setCurrentUser(prev => prev ? {
            ...prev,
            totalContributed: (prev.totalContributed || 0) + finalAmount,
            campaignsSupported: (prev.campaignsSupported || 0) + 1
          } : null);
        }
        setDonationSuccess(true);
        setCustomAmountStr('');
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
  });

  return (
    <div className="min-h-screen bg-[#f4f6f4] text-[#1c2b22] font-sans flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
      
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

            {/* Quick Trigger CTAs */}
            <button 
              onClick={() => {
                setNcSuccess(false);
                setShowStartCampaignModal(true);
              }}
              className="hidden sm:inline-block px-3 py-1.5 rounded-md text-xs font-bold text-emerald-100 border border-emerald-300/30 hover:border-white hover:text-white transition-all cursor-pointer"
            >
              Start Campaign
            </button>

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
            <section className="bg-white border-b border-emerald-100/60 shadow-sm">
              <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-emerald-100/40">
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">KES 4.2M</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Total Raised</div>
                </div>
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">48</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Active Campaigns</div>
                </div>
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">1,830</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Donors</div>
                </div>
                <div className="py-6 px-4 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#145a32]">100%</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Verified Orgs</div>
                </div>
              </div>
            </section>

            {/* Featured Section */}
            <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 w-full">
              <div className="flex justify-between items-baseline mb-8">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#0a3d1f]">Featured Campaigns</h2>
                  <p className="text-gray-500 text-xs mt-1">High-priority humanitarian and environmental tasks in urgent need of assistance</p>
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
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-emerald-50/70 transition-all hover:-translate-y-1 cursor-pointer flex flex-col h-full"
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

                        <h3 className="font-bold text-gray-900 leading-snug mb-2 group-hover:text-emerald-800 transition-colors line-clamp-2">
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
            <section className="bg-white border-b border-emerald-50 shadow-sm sticky top-[58px] z-40">
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
              <div className="text-sm text-gray-500 mb-6 flex justify-between items-center">
                <span>Showing <strong className="text-gray-900 font-bold">{filteredCampaigns.length}</strong> campaign{filteredCampaigns.length !== 1 ? 's' : ''}</span>
              </div>

              {filteredCampaigns.length === 0 ? (
                <div className="bg-white rounded-xl shadow-xs border border-emerald-50/50 p-12 text-center max-w-lg mx-auto mt-6">
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
                        className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-emerald-50/70 transition-all hover:-translate-y-1 cursor-pointer flex flex-col h-full"
                      >
                        <div 
                          className="py-10 text-center text-5xl select-none"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.icon}
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
                          <p className="text-gray-500 text-xs leading-relaxed mb-6 line-clamp-3">
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
                <div className="bg-white rounded-xl shadow-xs p-6 border border-emerald-50 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl select-none" style={{ backgroundColor: activeCampaign.color }}>
                    {activeCampaign.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{activeCampaign.org}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Verified NGO Partner · Nairobi Registry Office</p>
                  </div>
                </div>

                {/* About Campaign */}
                <div className="bg-white rounded-xl shadow-xs p-6 border border-emerald-50">
                  <h3 className="font-serif text-[#0a3d1f] font-bold text-lg border-b-2 border-emerald-50 pb-3 mb-4">
                    About This Campaign
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {activeCampaign.desc}
                  </p>
                </div>

                {/* Impact stats grid */}
                <div className="bg-white rounded-xl shadow-xs p-6 border border-emerald-50">
                  <h3 className="font-serif text-[#0a3d1f] font-bold text-lg border-b-2 border-emerald-50 pb-3 mb-4">
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
                <div className="bg-white rounded-xl shadow-xs p-6 border border-emerald-50">
                  <h3 className="font-serif text-[#0a3d1f] font-bold text-lg border-b-2 border-emerald-50 pb-3 mb-4">
                    How Funds Are Used
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium">
                    {activeCampaign.usage}
                  </p>
                </div>
              </div>

              {/* Right Column Sidebar Widget */}
              <div>
                <div className="bg-white rounded-xl shadow-md border border-emerald-50/80 p-6 sticky top-[90px] space-y-6">
                  
                  {/* Progress Header */}
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#0a3d1f] mb-3">Campaign Progress</h3>
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
                        <p className="text-xs text-gray-600">Your contribution of KES {(customAmountStr ? parseInt(customAmountStr) : donationAmount).toLocaleString()} was securely logged in real-time!</p>
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
                  </div>
                </div>
              </div>
            </section>
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
                      Demo Account Mode: Enter any email/password to instantiate temporary session token.
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
            <h1 className="font-serif text-3xl font-bold text-[#0a3d1f] mb-2">My Transparent Stewardship</h1>
            <p className="text-gray-500 text-sm mb-8">Inspect your verified donations ledger and adjust your circle profile photo seamlessly.</p>
            
            {currentUser ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Visual Circle Profile Info Box */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50/70 text-center flex flex-col items-center">
                  
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

                  <h2 className="font-serif text-[#0a3d1f] font-bold text-xl mt-5 mb-1">{currentUser.name}</h2>
                  <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-100/30">
                    Verified {currentUser.role}
                  </span>
                  
                  <p className="text-gray-500 text-xs font-mono font-medium truncate w-full px-4 mb-2">{currentUser.email}</p>
                  
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
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50/70 space-y-4">
                    <div className="flex items-center gap-2 text-[#0a3d1f]">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-serif font-bold text-base">Verified Impact Statement</h3>
                    </div>
                    
                    <p className="text-gray-600 text-xs leading-relaxed font-semibold">
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

                  {/* Sample Mock Activity Log ledger table */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50/70">
                    <h3 className="font-serif font-bold text-[#0a3d1f] text-base border-b border-emerald-50 pb-3 mb-4">
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
                                <td className="py-3 text-gray-900 font-bold">{c.campaignTitle}</td>
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
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 text-center rounded-xl max-w-lg mx-auto border border-emerald-50">
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
            © 2026 CharityLink · Transparent Giving Platform · Built with React + Tailwind v4 + esbuild
          </div>
        </div>
      </footer>

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
                    <h3 className="font-serif text-lg font-bold">Launch a Verified Campaign</h3>
                    <p className="text-emerald-300 text-[10px] font-semibold">Zero application or operational fees on CharityLink Kenya</p>
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
                  <form onSubmit={handleCreateCampaign} className="space-y-5">
                    
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
                        Publish Verified Campaign
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
                <p className="text-gray-600 text-xs leading-relaxed font-semibold">
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
                      <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed mt-1">
                        Your support has been linked. We have logged the transaction into your public ledger statement instantly! Check your profile to inspect the receipts.
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
