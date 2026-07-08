import React from 'react';
import { ArrowLeft, Shield, Zap, Cpu, Users, Lock, Sparkles } from 'lucide-react';
import GoogleAd from './GoogleAd';


export default function About({ navigate }) {
  return (
    <div className="min-h-screen w-full bg-gray-100 p-4 md:p-8 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white border-4 border-black p-6 shadow-neo mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-lime-400 text-black p-2 border-2 border-black">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">ABOUT ANONYCHAT</h1>
              <p className="font-mono text-xs font-bold text-gray-500">WHO WE ARE & WHY WE DO IT</p>
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

        {/* Main Content Grid */}
        <div className="space-y-8">
          {/* Mission Statement */}
          <section className="bg-white border-4 border-black p-6 md:p-8 shadow-neo">
            <h2 className="text-3xl font-black uppercase mb-4 border-b-4 border-black pb-2">THE MISSION</h2>
            <p className="text-lg font-medium leading-relaxed mb-4">
              ANONYCHAT was founded on a simple, uncompromising premise: <span className="bg-yellow-200 border border-black px-1 font-bold">your conversations should belong only to you</span>. 
              We live in an age where online tracking has become the norm, and private chat companies require your phone number, contacts, and personal data just to let you speak.
            </p>
            <p className="text-lg font-medium leading-relaxed">
              We built ANONYCHAT to restore chat to its natural, real-life state. Dynamic, ephemeral, secure, and completely anonymous. No signups, no trackers, no traces. Just raw, unfiltered communication.
            </p>
          </section>

          {/* Key Features */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-pink-300 border-4 border-black p-6 shadow-neo flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <div>
                <div className="bg-white border-2 border-black p-2 w-fit mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black uppercase mb-2">Zero Database</h3>
                <p className="font-mono text-sm font-bold text-gray-800">
                  Messages exist only in active server memory and are immediately destroyed when you leave the room.
                </p>
              </div>
            </div>

            <div className="bg-cyan-300 border-4 border-black p-6 shadow-neo flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <div>
                <div className="bg-white border-2 border-black p-2 w-fit mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black uppercase mb-2">Instant Speed</h3>
                <p className="font-mono text-sm font-bold text-gray-800">
                  Powered by WebSockets for sub-millisecond packet transmission across rooms.
                </p>
              </div>
            </div>

            <div className="bg-orange-300 border-4 border-black p-6 shadow-neo flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <div>
                <div className="bg-white border-2 border-black p-2 w-fit mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black uppercase mb-2">Gemini AI Hook</h3>
                <p className="font-mono text-sm font-bold text-gray-800">
                  Direct integration with Google's Gemini models for interactive real-time workspace assistance.
                </p>
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="bg-white border-4 border-black p-6 md:p-8 shadow-neo">
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-black pb-2">THE TECH STACK</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm font-bold">
              <div className="border-2 border-black p-4 text-center bg-gray-50">
                <p className="text-lg mb-1">React 19</p>
                <span className="text-xs text-gray-500">FRONTEND</span>
              </div>
              <div className="border-2 border-black p-4 text-center bg-gray-50">
                <p className="text-lg mb-1">Tailwind V3</p>
                <span className="text-xs text-gray-500">STYLING</span>
              </div>
              <div className="border-2 border-black p-4 text-center bg-gray-50">
                <p className="text-lg mb-1">Socket.io</p>
                <span className="text-xs text-gray-500">REAL-TIME COMM</span>
              </div>
              <div className="border-2 border-black p-4 text-center bg-gray-50">
                <p className="text-lg mb-1">Gemini API</p>
                <span className="text-xs text-gray-500">ARTIFICIAL INTEL</span>
              </div>
            </div>
          </section>

          {/* Integrity Pledge */}
          <section className="bg-purple-200 border-4 border-black p-6 md:p-8 shadow-neo text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-purple-700" />
            <h2 className="text-2xl font-black uppercase mb-2">THE INTEGRITY PLEDGE</h2>
            <p className="font-mono text-sm font-bold text-purple-900 max-w-xl mx-auto">
              We do not track IP addresses. We do not sell user metadata. We use privacy-conscious advertising partners like Google AdSense to sustain our server infrastructure. We are open source, developer-focused, and privacy-first.
            </p>
          </section>

          {/* Google Ad for AdSense Compliance */}
          <div className="mt-8 border-t-4 border-black pt-6">
            <GoogleAd isDarkTheme={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
