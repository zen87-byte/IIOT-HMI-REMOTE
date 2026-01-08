import React from "react";
import { useAlarms } from "@/hooks/useAlarms";
import useMotorData from "@/hooks/useMotorData";
import { HelpCircle, FileText } from "lucide-react";

const AlarmPage = () => {
    const motorData = useMotorData(true, "live");
    const { thresholds } = useAlarms(
        motorData.current,
        motorData.rpm,
        motorData.voltage,
        true
    );

    const alarms = [
        {
            name: "Motor Over Speed (RPM)",
            status: motorData.rpm > 2000, // Example logic
            threshold: "24 RPM", // Matching the image, although 24 is low for RPM
            troubleshoot: "Lower the set point; Check the controller; Check motor and controller's connection.",
        },
        {
            name: "Over Voltage (V)",
            status: motorData.voltage > 240,
            threshold: "240V",
            troubleshoot: "Turn off the contactor coil by turning off the controller; Disconnect the power source.",
        },
        {
            name: "Over Current (mA)",
            status: motorData.current > 1.47,
            threshold: "1.47 A",
            troubleshoot: "Turn off the contactor coil by turning off the controller; Disconnect the power source.",
        },
        {
            name: "VSD Communication",
            status: false,
            threshold: "-",
            troubleshoot: "Check the power supply connection cable and data communication cable.",
        },
        {
            name: "Power Meter Communication",
            status: false,
            threshold: "-",
            troubleshoot: "Check the power supply connection cable and data communication cable.",
        },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse border border-[#9ca3af]">
                    <thead>
                        <tr className="bg-[#cbd5e1] text-[#1e3a8a] text-lg">
                            <th className="border border-[#9ca3af] p-3 text-center w-1/4">Alarm</th>
                            <th className="border border-[#9ca3af] p-3 text-center w-1/6">Status</th>
                            <th className="border border-[#9ca3af] p-3 text-center w-1/6">Treshold</th>
                            <th className="border border-[#9ca3af] p-3 text-center w-5/12">Troubleshoot</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {alarms.map((alarm, index) => (
                            <tr key={index} className="text-[#1e3a8a]">
                                <td className="border border-[#9ca3af] p-3 text-center font-medium">
                                    {alarm.name}
                                </td>
                                <td className="border border-[#9ca3af] p-3">
                                    <div className="flex justify-center">
                                        <div className={`w-20 h-8 rounded-lg border-2 border-black shadow-inner flex items-center justify-center ${alarm.status
                                                ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"
                                                : "bg-[#2d2d2d] bg-gradient-to-b from-[#4a4a4a] to-[#1a1a1a]"
                                            }`}>
                                            {alarm.status && <div className="w-full h-full bg-white/20 animate-pulse rounded-lg" />}
                                        </div>
                                    </div>
                                </td>
                                <td className="border border-[#9ca3af] p-3 text-center">
                                    {alarm.threshold}
                                </td>
                                <td className="border border-[#9ca3af] p-3 text-sm leading-tight">
                                    {alarm.troubleshoot}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Buttons */}
            <div className="mt-8 flex justify-between items-center">
                <button className="flex items-center gap-2 bg-[#cbd5e1] border-2 border-[#9ca3af] px-4 py-2 rounded shadow-sm hover:bg-[#9ca3af] transition-colors text-[#1e3a8a] font-bold">
                    <HelpCircle className="w-6 h-6 text-blue-800" />
                    Instructions...
                </button>

                <button className="flex items-center gap-2 bg-[#cbd5e1] border-2 border-[#9ca3af] px-4 py-2 rounded shadow-sm hover:bg-[#9ca3af] transition-colors text-[#1e3a8a] font-bold text-sm">
                    <div className="bg-white p-1 rounded border border-[#9ca3af]">
                        <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    Alarm Log
                </button>
            </div>
        </div>
    );
};

export default AlarmPage;
