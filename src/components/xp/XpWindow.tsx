'use client';

import React, { useState } from 'react';
import { Minus, Square, X, RefreshCw } from 'lucide-react';

interface XpWindowProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  statusBarText?: string;
  onRefresh?: () => void;
  className?: string;
}

export function XpWindow({ title, icon, children, statusBarText, onRefresh, className = '' }: XpWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return null;
  }

  return (
    <div
      className={`xp-window flex flex-col transition-all duration-150 ${
        isMaximized ? 'fixed inset-2 z-40' : 'w-full shadow-2xl'
      } ${className}`}
    >
      {/* Title Bar */}
      <div className="xp-titlebar flex items-center justify-between px-3 py-1.5 select-none">
        <div className="flex items-center gap-2 font-bold text-sm text-white tracking-wide drop-shadow truncate">
          {icon && <span className="flex items-center">{icon}</span>}
          <span>{title}</span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh / Rescan"
              className="w-5 h-5 flex items-center justify-center bg-gradient-to-b from-blue-400 to-blue-700 hover:brightness-110 border border-blue-900 rounded-sm text-white text-xs font-bold shadow-sm active:translate-y-0.5"
            >
              <RefreshCw size={11} />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize"
            className="w-5 h-5 flex items-center justify-center bg-gradient-to-b from-blue-400 to-blue-700 hover:brightness-110 border border-blue-900 rounded-sm text-white text-xs font-bold shadow-sm active:translate-y-0.5"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore' : 'Maximize'}
            className="w-5 h-5 flex items-center justify-center bg-gradient-to-b from-blue-400 to-blue-700 hover:brightness-110 border border-blue-900 rounded-sm text-white text-xs font-bold shadow-sm active:translate-y-0.5"
          >
            <Square size={10} />
          </button>
          <button
            onClick={() => alert('Webalyzer primary window cannot be closed while active!')}
            title="Close"
            className="w-5 h-5 flex items-center justify-center bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 border border-red-900 rounded-sm text-white font-bold shadow-sm active:translate-y-0.5"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Menu / Address Bar Emulation */}
      <div className="bg-[#ece9d8] border-b border-[#716f64] px-3 py-1 text-xs text-black flex items-center gap-4 select-none">
        <span className="cursor-pointer hover:underline">File</span>
        <span className="cursor-pointer hover:underline">Edit</span>
        <span className="cursor-pointer hover:underline">View</span>
        <span className="cursor-pointer hover:underline">Tools</span>
        <span className="cursor-pointer hover:underline">Help</span>
        <div className="ml-auto text-[11px] text-gray-600 font-mono">XP-EDITION v2.5</div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#ece9d8] p-3 overflow-y-auto max-h-[80vh] min-h-[400px]">
        {children}
      </div>

      {/* Status Bar */}
      {statusBarText && (
        <div className="bg-[#ece9d8] border-t border-[#716f64] px-3 py-1 text-[11px] text-gray-700 flex items-center justify-between font-sans select-none">
          <div className="flex items-center gap-2 truncate">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate">{statusBarText}</span>
          </div>
          <span className="font-mono text-gray-500 hidden sm:inline">Local Zone | Internet Security Active</span>
        </div>
      )}
    </div>
  );
}
