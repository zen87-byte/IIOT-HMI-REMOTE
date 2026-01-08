import React from "react";
import { Settings, User, Bell, Shield, Gauge } from "lucide-react";
import UnitSelector from "@/components/UnitSelector";
import { useUnitConversion } from "@/hooks/useUnitConversion";

const SettingsPage = () => {
    const { speedUnit, setSpeedUnit, powerUnit, setPowerUnit } = useUnitConversion();

    return (
        <div className="flex flex-col gap-8 h-full">
            <h2 className="text-2xl font-bold text-[#1e3a8a] border-b-2 border-[#1e3a8a] pb-2 inline-block">
                System Settings
            </h2>

            <div className="bg-white p-8 rounded border-2 border-[#9ca3af] space-y-8">
                <section>
                    <div className="flex items-center gap-2 mb-4 text-[#1e3a8a]">
                        <Gauge className="w-5 h-5" />
                        <h3 className="font-bold">Display Units</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6">
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-[#1e3a8a]">Speed Unit</p>
                            <UnitSelector type="speed" value={speedUnit} onChange={setSpeedUnit} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-[#1e3a8a]">Power Unit</p>
                            <UnitSelector type="power" value={powerUnit} onChange={setPowerUnit} />
                        </div>
                    </div>
                </section>

                <section className="pt-8 border-t border-[#9ca3af]">
                    <div className="flex items-center gap-2 mb-4 text-[#1e3a8a]">
                        <Bell className="w-5 h-5" />
                        <h3 className="font-bold">Notification Thresholds</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                        <div className="p-3 bg-gray-100 border border-[#9ca3af] rounded flex justify-between">
                            <span className="font-bold">Over Speed</span>
                            <span className="text-red-600 font-bold">2000 RPM</span>
                        </div>
                        <div className="p-3 bg-gray-100 border border-[#9ca3af] rounded flex justify-between">
                            <span className="font-bold">Over Voltage</span>
                            <span className="text-red-600 font-bold">240 V</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
