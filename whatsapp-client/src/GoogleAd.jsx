import React, { useState, useEffect } from 'react';
import { Sparkles, Info, X, Zap, Shield } from 'lucide-react';

const AD_CAMPAIGNS = [
  {
    id: 'premium',
    title: "Disable Ads. Unlock Premium.",
    description: "Get custom room badges, direct AI commands, and exclusive premium styles.",
    cta: "UPGRADE NOW",
    badge: "ANONYCHAT PRO",
    color: "from-pink-500 to-purple-500",
    textColor: "text-white",
    ctaColor: "bg-yellow-300 text-black hover:bg-yellow-200"
  },
  {
    id: 'gemini',
    title: "Meet Gemini AI Assistant",
    description: "Tag @gemini in any message to brainstorm ideas, write code, or get instant help.",
    cta: "TRY GEMINI",
    badge: "AI COMPANION",
    color: "from-blue-500 to-purple-600",
    textColor: "text-white",
    ctaColor: "bg-green-400 text-black hover:bg-green-300"
  },
  {
    id: 'privacy',
    title: "Need absolute privacy?",
    description: "Enable room passwords to create an encrypted workspace for you and your team.",
    cta: "CREATE SECURE ROOM",
    badge: "PRIVACY MAX",
    color: "from-emerald-500 to-teal-600",
    textColor: "text-white",
    ctaColor: "bg-white text-black hover:bg-gray-100"
  }
];

export default function GoogleAd({ isDarkTheme, onAction, client, slot }) {
  const [adState, setAdState] = useState('active'); // 'active' | 'feedback' | 'closed'
  const [adType, setAdType] = useState('fallback'); // 'fallback' | 'adsense' | 'admob'
  const [campaign, setCampaign] = useState(AD_CAMPAIGNS[0]);

  // Select a random campaign on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * AD_CAMPAIGNS.length);
    setCampaign(AD_CAMPAIGNS[randomIndex]);
  }, []);

  // AdMob & AdSense integration
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // 1. Check for Mobile Wrapper (Capacitor/Cordova) for Google AdMob
    const isCapacitor = window.Capacitor !== undefined;
    const isCordova = window.cordova !== undefined;

    if (isCapacitor || isCordova) {
      // Check if native AdMob plugin is registered in Capacitor
      if (isCapacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        setAdType('admob');
        const AdMob = window.Capacitor.Plugins.AdMob;
        
        // Initialize AdMob and show banner
        const adMobId = import.meta.env.VITE_ADMOB_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111'; // Google AdMob Banner Test ID
        
        AdMob.initialize({ requestTrackingAuthorization: true })
          .then(() => {
            AdMob.showBanner({
              adId: adMobId,
              adSize: 'BANNER',
              position: 'BOTTOM_CENTER',
              margin: 0
            });
          })
          .catch((err) => {
            console.warn("Google AdMob initialization error:", err);
            setAdType('fallback');
          });
        return;
      }
    }

    // 2. Fall back to Google AdSense for Web
    if (isLocalhost) {
      setAdType('fallback');
      return;
    }

    const adClient = client || import.meta.env.VITE_ADSENSE_CLIENT;
    const adSlot = slot || import.meta.env.VITE_ADSENSE_SLOT;

    if (adClient && adSlot) {
      try {
        const scriptId = 'adsbygoogle-js';
        let script = document.getElementById(scriptId);
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
        }

        // Initialize Web AdSense
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdType('adsense');
      } catch (err) {
        console.warn("Failed to load Google AdSense script:", err);
        setAdType('fallback');
      }
    } else {
      setAdType('fallback');
    }
  }, [client, slot]);

  // Clean up AdMob native banner if component unmounts or ad is closed
  useEffect(() => {
    return () => {
      const isCapacitor = window.Capacitor !== undefined;
      if (isCapacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        try {
          window.Capacitor.Plugins.AdMob.hideBanner();
        } catch (e) {
          // Silence cleanup error
        }
      }
    };
  }, [adState]);

  if (adState === 'closed') {
    return null;
  }

  // Handle CTA Click
  const handleCtaClick = (e) => {
    e.preventDefault();
    if (onAction) {
      onAction(campaign.id);
    }
  };

  // Render standard AdSense structure (Web)
  const renderRealAdSense = () => {
    const adClient = client || import.meta.env.VITE_ADSENSE_CLIENT;
    const adSlot = slot || import.meta.env.VITE_ADSENSE_SLOT;
    return (
      <div className="w-full flex justify-center py-1 bg-transparent overflow-hidden">
        <ins className="adsbygoogle"
             style={{ display: 'block', width: '100%', height: '90px' }}
             data-ad-client={adClient}
             data-ad-slot={adSlot}
             data-ad-format="horizontal"
             data-full-width-responsive="false"></ins>
      </div>
    );
  };

  // Render AdMob Spacer (Native banners float over the webview, requiring DOM offset spacing)
  const renderAdMobSpacer = () => {
    return (
      <div className={`w-full py-3 px-4 border-b-4 border-black text-center font-mono text-xs ${isDarkTheme ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
        ⚡ Native Google AdMob banner loaded successfully overlaying view.
      </div>
    );
  };

  // Render interactive fallback mockup
  const renderFallbackAd = () => {
    if (adState === 'feedback') {
      return (
        <div className={`p-4 text-center border-b-4 border-black ${isDarkTheme ? 'bg-gray-800 text-white' : 'bg-yellow-50 text-black'} font-mono flex flex-col items-center justify-center min-h-[90px] transition-all duration-300`}>
          <p className="text-sm font-black mb-2">Ad closed by Google. What was wrong with this ad?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Seen multiple times', 'Not relevant', 'Inappropriate'].map((reason) => (
              <button
                key={reason}
                onClick={() => {
                  setAdState('closed');
                  alert("Thanks! Feedback received. We'll improve your ad experience.");
                }}
                className={`text-xs px-3 py-1 font-bold border-2 border-black shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${
                  isDarkTheme ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-black'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={`relative border-b-4 border-black p-3 overflow-hidden transition-all duration-300 bg-gradient-to-r ${campaign.color} ${campaign.textColor}`}>
        {/* Ad Badge & Control Panel */}
        <div className="absolute top-1.5 left-3 flex items-center gap-1.5 z-10">
          <span className="bg-black/80 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 border border-white/20 uppercase tracking-wide rounded">
            Ad
          </span>
          <span className="text-[10px] font-mono font-bold tracking-tight opacity-75 hidden sm:inline">
            {campaign.badge}
          </span>
        </div>

        {/* Ad choices - styled like real Google AdSense */}
        <div className="absolute top-1.5 right-3 flex items-center gap-2 z-10 text-white/80">
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-0.5 font-mono text-[9px] font-medium"
            title="AdChoices"
          >
            <span>AdChoices</span>
            <Info size={10} className="stroke-[2.5]" />
          </a>
          <button
            onClick={() => setAdState('feedback')}
            className="hover:text-white hover:bg-black/25 p-0.5 rounded transition-colors"
            title="Close Ad"
          >
            <X size={12} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 sm:mt-1 pt-1.5">
          <div className="flex items-center gap-3">
            <div className="bg-black text-yellow-400 p-2 border-2 border-black hidden md:block animate-pulse shrink-0">
              {campaign.id === 'premium' ? <Zap size={20} /> : campaign.id === 'gemini' ? <Sparkles size={20} /> : <Shield size={20} />}
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base leading-tight tracking-tight uppercase">
                {campaign.title}
              </h3>
              <p className="text-xs opacity-90 line-clamp-2 sm:line-clamp-1 max-w-[450px] leading-snug">
                {campaign.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end">
            <button
              onClick={handleCtaClick}
              className={`text-xs md:text-sm font-black border-2 border-black py-1.5 px-4 shadow-neo-sm hover:scale-[1.02] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase ${campaign.ctaColor}`}
            >
              {campaign.cta}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full shrink-0 select-none z-10">
      {adType === 'admob' ? renderAdMobSpacer() : adType === 'adsense' ? renderRealAdSense() : renderFallbackAd()}
    </div>
  );
}

