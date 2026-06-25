import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, CheckCircle } from 'lucide-react';

export default function PrivacyPolicy({ navigate }) {
  return (
    <div className="min-h-screen w-full bg-gray-100 p-4 md:p-8 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white border-4 border-black p-6 shadow-neo mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-300 text-black p-2 border-2 border-black">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">PRIVACY POLICY</h1>
              <p className="font-mono text-xs font-bold text-gray-500">COOKIE POLICY & DATA TRANSPARENCY</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-yellow-300 hover:bg-yellow-200 border-4 border-black px-6 py-3 font-bold shadow-neo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            BACK TO CHAT
          </button>
        </header>

        {/* Content Blocks */}
        <div className="space-y-8">
          {/* Main Disclosure */}
          <section className="bg-white border-4 border-black p-6 md:p-8 shadow-neo">
            <h2 className="text-3xl font-black uppercase mb-4 border-b-4 border-black pb-2">DATA DICTIONARY</h2>
            <p className="text-lg font-medium leading-relaxed mb-4">
              At ANONYCHAT, we prioritize user security and transparency. Because this is a dynamic, ephemeral chat room application, we store as little metadata as possible.
            </p>
            <p className="text-lg font-medium leading-relaxed">
              Below, we describe exactly what information is collected, how it is used, and how third-party advertisements (such as Google AdSense) manage tracking cookies.
            </p>
          </section>

          {/* AdSense Disclosures */}
          <section className="bg-pink-300 border-4 border-black p-6 md:p-8 shadow-neo">
            <div className="bg-white border-2 border-black p-2 w-fit mb-4">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase mb-4">GOOGLE ADSENSE & COOKIES</h2>
            <div className="space-y-4 font-mono text-sm font-bold text-gray-900">
              <div className="bg-white p-3 border-2 border-black">
                <span className="text-pink-600 block mb-1">● THIRD-PARTY VENDORS</span>
                Google, as a third-party vendor, uses cookies to serve ads on this website.
              </div>
              <div className="bg-white p-3 border-2 border-black">
                <span className="text-pink-600 block mb-1">● DOUBLECLICK DART COOKIE</span>
                Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet.
              </div>
              <div className="bg-white p-3 border-2 border-black">
                <span className="text-pink-600 block mb-1">● OPT-OUT OPTIONS</span>
                Users may opt out of personalized advertising by visiting the Google Ads Settings page: 
                <a 
                  href="https://adssettings.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block mt-2 text-blue-600 underline font-black hover:text-blue-800"
                >
                  Configure Ads Settings ↗
                </a>
              </div>
            </div>
          </section>

          {/* Chat Data & Memory */}
          <section className="bg-cyan-300 border-4 border-black p-6 md:p-8 shadow-neo">
            <div className="bg-white border-2 border-black p-2 w-fit mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase mb-4">CHAT & MESSAGES STORAGE</h2>
            <div className="space-y-4 font-mono text-sm font-bold text-gray-900">
              <p className="bg-white p-3 border-2 border-black">
                <span className="text-cyan-600 block mb-1">● ROOM MESSAGES</span>
                Your messages exist only inside the active memory of our secure socket server. We do not maintain long-term server-side database histories, and messages are cleared when a user logs out or leaves a room.
              </p>
              <p className="bg-white p-3 border-2 border-black">
                <span className="text-cyan-600 block mb-1">● USER AUTHENTICATION</span>
                We use Firebase Authentication (Google Single Sign-On) solely to verify accounts and combat spam/abuse. Your actual Google account information is never shared, rented, or sold.
              </p>
            </div>
          </section>

          {/* Consent */}
          <section className="bg-purple-200 border-4 border-black p-6 md:p-8 shadow-neo text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-purple-700" />
            <h2 className="text-2xl font-black uppercase mb-2">USER CONSENT</h2>
            <p className="font-mono text-sm font-bold text-purple-900 max-w-xl mx-auto">
              By using our service, you consent to our Privacy Policy and agree to our integration of Google AdSense for hosting support.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
