'use client';

import React from 'react';
import { Search, Shield, Globe, Terminal, HelpCircle, Power, Database, Cpu, History } from 'lucide-react';

interface XpStartMenuProps {
  onClose: () => void;
}

export function XpStartMenu({ onClose }: XpStartMenuProps) {
  return (
    <div className="fixed bottom-10 left-1 w-80 bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-lg shadow-2xl z-50 overflow-hidden font-sans text-xs select-none">
      {/* Start Menu Header */}
      <div className="xp-titlebar p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-yellow-400 to-amber-600 border-2 border-white flex items-center justify-center text-white font-bold text-lg shadow">
          W
        </div>
        <div>
          <div className="font-bold text-white text-sm">Administrator</div>
          <div className="text-[11px] text-blue-100 opacity-90">Webalyzer OSINT Workstation</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 bg-white p-1 border-t border-b border-[#0054e3]">
        {/* Left Column - Main Apps */}
        <div className="p-2 space-y-2 border-r border-gray-200">
          <div className="flex items-center gap-2 p-1.5 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer group">
            <Shield size={16} className="text-blue-600 group-hover:text-white" />
            <div>
              <div className="font-bold">Webalyzer Pro</div>
              <div className="text-[10px] text-gray-500 group-hover:text-gray-200">Tech Stack Recon</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer group">
            <Globe size={16} className="text-emerald-600 group-hover:text-white" />
            <div>
              <div className="font-bold">Endpoint Miner</div>
              <div className="text-[10px] text-gray-500 group-hover:text-gray-200">SharePoint & APIs</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer group">
            <History size={16} className="text-amber-600 group-hover:text-white" />
            <div>
              <div className="font-bold">Wayback Time Machine</div>
              <div className="text-[10px] text-gray-500 group-hover:text-gray-200">Historical Dates</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer group">
            <Terminal size={16} className="text-purple-600 group-hover:text-white" />
            <div>
              <div className="font-bold">Command Prompt</div>
              <div className="text-[10px] text-gray-500 group-hover:text-gray-200">Realtime Console</div>
            </div>
          </div>
        </div>

        {/* Right Column - Places / Tools */}
        <div className="bg-[#d3e5fa] p-2 space-y-2 font-semibold text-blue-900">
          <div className="flex items-center gap-2 p-1 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer">
            <Cpu size={14} />
            <span>My Computer</span>
          </div>
          <div className="flex items-center gap-2 p-1 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer">
            <Database size={14} />
            <span>Data Sources</span>
          </div>
          <div className="flex items-center gap-2 p-1 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer">
            <Search size={14} />
            <span>Search Targets</span>
          </div>
          <div className="flex items-center gap-2 p-1 hover:bg-[#316ac5] hover:text-white rounded cursor-pointer">
            <HelpCircle size={14} />
            <span>Help & Support</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#4282d6] p-2 flex items-center justify-between text-white font-bold">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2 py-1 bg-amber-500 hover:bg-amber-600 rounded text-white text-xs border border-amber-700 shadow"
        >
          <Power size={13} />
          <span>Turn Off Webalyzer</span>
        </button>
      </div>
    </div>
  );
}
