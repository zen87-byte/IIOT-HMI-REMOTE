import React from "react";
import { Info, Factory, Cpu, Network } from "lucide-react";

const PlantInfoPage = () => {
    return (
        <div className="flex flex-col gap-8 h-full">
            <h2 className="text-2xl font-bold text-[#1e3a8a] border-b-2 border-[#1e3a8a] pb-2 inline-block">
                Plant Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded border-2 border-[#9ca3af]">
                    <div className="flex items-center gap-3 mb-4 text-[#1e3a8a]">
                        <Factory className="w-8 h-8" />
                        <h3 className="text-xl font-bold">System Details</h3>
                    </div>
                    <div className="space-y-3 font-medium text-[#1e3a8a]">
                        <p><span className="text-gray-500">Plant Name:</span> IIoT AC Motor Lab</p>
                        <p><span className="text-gray-500">Location:</span> Lab. IIoT - Teknik Fisika ITB</p>
                        <p><span className="text-gray-500">Controller:</span> ESP32 + VSD Mitsubishi</p>
                        <p><span className="text-gray-500">Last Service:</span> 01/12/2025</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded border-2 border-[#9ca3af]">
                    <div className="flex items-center gap-3 mb-4 text-[#1e3a8a]">
                        <Network className="w-8 h-8" />
                        <h3 className="text-xl font-bold">Network Status</h3>
                    </div>
                    <div className="space-y-3 font-medium text-[#1e3a8a]">
                        <p><span className="text-gray-500">Protocol:</span> MQTT / WebSockets</p>
                        <p><span className="text-gray-500">Broker:</span> test.mosquitto.org</p>
                        <p><span className="text-gray-500">Latency:</span> 45ms</p>
                        <p><span className="text-gray-500">Status:</span> CONNECTED</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlantInfoPage;
