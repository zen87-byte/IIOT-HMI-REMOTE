import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface HMILayoutProps {
    children: React.ReactNode;
}

const HMILayout: React.FC<HMILayoutProps> = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const dayName = days[date.getDay()];
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const y = String(date.getFullYear()).slice(-2);
        return `${d}/${m}/${y} ${dayName}`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-GB", { hour12: false });
    };

    const navItems = [
        { label: "DASHBOARD", path: "/" },
        { label: "MONITORING", path: "/monitoring" },
        { label: "CONTROLLER", path: "/controller" },
        { label: "ALARM", path: "/alarm" },
        { label: "PLANT INFO", path: "/plant-info" },
        { label: "SETTINGS", path: "/settings" },
    ];

    return (
        <div className="min-h-screen bg-[#d1d5db] flex flex-col font-sans text-[#1e3a8a]">
            {/* Top Header */}
            <header className="h-20 bg-[#d1d5db] border-b border-[#9ca3af] flex items-center px-6 justify-between">
                <div className="flex items-center gap-4">
                    <img
                        src="/Logo_Institut_Teknologi_Bandung.png"
                        alt="ITB Logo"
                        className="h-12 w-auto object-contain"
                    />
                    <h1 className="text-3xl font-bold tracking-tight text-[#1e3a8a]">
                        Sistem Kontrol Motor AC
                    </h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img
                            src="/STEI ITB logo.png"
                            alt="STEI ITB"
                            className="h-10 w-auto object-contain"
                        />
                    </div>
                    <div className="flex items-center gap-2 border-l border-[#9ca3af] pl-6">
                        <img
                            src="/Teknik Fisika.png"
                            alt="Teknik Fisika"
                            className="h-10 w-auto object-contain"
                        />
                    </div>
                </div>
            </header>

            {/* Sub Header Bar */}
            <div className="h-10 bg-[#cbd5e1] border-b border-[#9ca3af] flex items-center px-6 justify-between text-sm font-medium">
                <div className="flex gap-8">
                    <span>TF4017 Industrial Internet of Things</span>
                    <span className="border-l border-r border-[#9ca3af] px-8">Human Machine Interface Remote</span>
                </div>
                <div className="flex gap-4">
                    <span>{formatDate(currentTime)}</span>
                    <span className="font-mono">{formatTime(currentTime)}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
                    <div className="w-full max-w-5xl bg-[#e2e8f0] border border-[#9ca3af] rounded shadow-inner p-6 min-h-[500px] flex flex-col">
                        {children}
                    </div>
                </main>

                {/* Right Sidebar */}
                <nav className="w-64 bg-[#cbd5e1] border-l border-[#9ca3af] flex flex-col">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "h-16 flex items-center justify-center text-lg font-bold border-b border-[#9ca3af] transition-colors",
                                    isActive
                                        ? "bg-[#4b5563] text-[#60a5fa]"
                                        : "text-[#1e3a8a] hover:bg-[#9ca3af]/20"
                                )}
                            >
                                {item.label}
                            </NavLink>
                        );
                    })}
                    <div className="mt-auto p-4 flex flex-col gap-2">
                        <div className="bg-[#4b5563] text-[#60a5fa] h-16 flex items-center justify-center text-2xl font-bold rounded shadow-lg">
                            {navItems.find(n => n.path === location.pathname)?.label || "DASHBOARD"}
                        </div>
                    </div>
                </nav>
            </div>
        </div>
    );
};

export default HMILayout;
