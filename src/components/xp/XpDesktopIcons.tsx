'use client';

import React from 'react';
import { Monitor, Globe, Database, ShieldAlert, FolderGit2 } from 'lucide-react';

interface DesktopIconProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function DesktopIcon({ icon, label, onClick }: DesktopIconProps) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-1 w-20 p-2 rounded hover:bg-white/20 hover:backdrop-blur-sm cursor-pointer group text-center select-none"
    >
      <div className="w-10 h-10 flex items-center justify-center text-white drop-shadow-md group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <span className="text-[11px] font-sans font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] line-clamp-2 leading-tight">
        {label}
      </span>
    </div>
  );
}

export function XpDesktopIcons({ onPresetClick }: { onPresetClick?: (url: string) => void }) {
  return (
    <div className="fixed top-4 left-4 flex flex-col gap-4 z-10 hidden sm:flex">
      <DesktopIcon
        icon={<Monitor className="w-9 h-9 text-cyan-300" />}
        label="My Workstation"
        onClick={() => alert('Webalyzer Workstation v2.5 Online')}
      />
      <DesktopIcon
        icon={<Globe className="w-9 h-9 text-blue-300" />}
        label="Analyze Google"
        onClick={() => onPresetClick && onPresetClick('https://google.com')}
      />
      <DesktopIcon
        icon={<Database className="w-9 h-9 text-emerald-300" />}
        label="Analyze SharePoint"
        onClick={() => onPresetClick && onPresetClick('https://microsoft.sharepoint.com')}
      />
      <DesktopIcon
        icon={<FolderGit2 className="w-9 h-9 text-amber-300" />}
        label="Analyze GitHub"
        onClick={() => onPresetClick && onPresetClick('https://github.com')}
      />
      <DesktopIcon
        icon={<ShieldAlert className="w-9 h-9 text-purple-300" />}
        label="Security Scanner"
        onClick={() => alert('Security Headers & SSL Audit Engine Active')}
      />
    </div>
  );
}
