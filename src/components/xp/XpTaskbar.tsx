'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Cpu, Activity, Clock } from 'lucide-react';
import { XpStartMenu } from './XpStartMenu';

interface XpTaskbarProps {
  analyzing: boolean;
  activeDomain?: string;
}

export function XpTaskbar({ analyzing, activeDomain }: XpTaskbarProps) {
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {showStartMenu && <XpStartMenu onClose={() => setShowStartMenu(false)} />}
      
      <div className="fixed bottom-0 left-0 right-0 h-10 xp-taskbar z-50 flex items-center justify-between px-1 select-none shadow-2xl">
        <div className="flex items-center gap-2 h-full">
          {/* Start Button */}
          <button
            onClick={() => setShowStartMenu(!showStartMenu)}
            className="xp-start-button h-8 px-3 flex items-center gap-2 text-white font-bold italic tracking-wide text-sm active:translate-y-0.5"
          >
            {/* Windows 4-color flag icon emulation */}
            <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 rotate-6">
              <div className="bg-red-500 rounded-tl-sm"></div>
              <div className="bg-green-500 rounded-tr-sm"></div>
              <div className="bg-blue-500 rounded-bl-sm"></div>
              <div className="bg-yellow-400 rounded-br-sm"></div>
            </div>
            <span>start</span>
          </button>

          {/* Active Window Button */}
          <div className="h-7 px-3 bg-[#1e52cf] border border-blue-900 rounded flex items-center gap-2 text-white text-xs font-semibold shadow-inner max-w-[220px] truncate">
            <Shield size={14} className="text-cyan-300 animate-pulse" />
            <span className="truncate">Webalyzer {activeDomain ? `- [${activeDomain}]` : ''}</span>
          </div>
        </div>

        {/* System Tray */}
        <div className="h-full bg-gradient-to-r from-[#0c82e7] to-[#095bc5] border-l border-blue-400 px-3 flex items-center gap-3 text-white text-xs">
          {analyzing ? (
            <div className="flex items-center gap-1.5 text-yellow-300 font-mono text-[11px] animate-pulse">
              <Activity size={13} className="animate-spin" />
              <span>SCANNING...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-300 text-[11px]">
              <Cpu size={13} />
              <span>READY</span>
            </div>
          )}
          
          <div className="h-4 w-px bg-blue-300 opacity-40"></div>
          
          <div className="flex items-center gap-1 text-white font-sans text-xs">
            <Clock size={12} className="opacity-80" />
            <span>{timeStr || '12:00 PM'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
