import React, { useState } from "react";
import StatusCard from "@/components/StatusCard";
import useMotorData from "@/hooks/useMotorData";
import { Zap, Activity, Gauge, Bolt } from "lucide-react";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import { useAlarms } from "@/hooks/useAlarms";

const DashboardPage = () => {
    const motorData = useMotorData(true, "live");
    const {
        speedUnit, convertSpeed, getSpeedUnitLabel,
        powerUnit, convertPower, getPowerUnitLabel,
        calculatePower
    } = useUnitConversion();

    const { thresholds } = useAlarms(
        motorData.current,
        motorData.rpm,
        motorData.voltage,
        true
    );

    const powerWatts = calculatePower(motorData.voltage, motorData.current);
    const displayPower = convertPower(powerWatts);

    return (
        <div className="flex flex-col gap-8 h-full">
            <h2 className="text-2xl font-bold text-[#1e3a8a] mb-4 border-b-2 border-[#1e3a8a] pb-2 inline-block">
                System Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                <div className="bg-white p-6 rounded-lg border-2 border-[#9ca3af] shadow-md flex flex-col items-center justify-center">
                    <Gauge className="w-16 h-16 text-[#1e3a8a] mb-4" />
                    <p className="text-xl font-bold text-[#1e3a8a]">Motor Speed</p>
                    <p className="text-5xl font-mono font-bold text-[#1e3a8a] my-4">
                        {convertSpeed(motorData.rpm).toFixed(1)}
                    </p>
                    <p className="text-lg font-bold text-blue-600">{getSpeedUnitLabel()}</p>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-[#9ca3af] shadow-md flex flex-col items-center justify-center">
                    <Zap className="w-16 h-16 text-yellow-600 mb-4" />
                    <p className="text-xl font-bold text-[#1e3a8a]">Voltage</p>
                    <p className="text-5xl font-mono font-bold text-[#1e3a8a] my-4">
                        {motorData.voltage.toFixed(1)}
                    </p>
                    <p className="text-lg font-bold text-blue-600">V</p>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-[#9ca3af] shadow-md flex flex-col items-center justify-center">
                    <Activity className="w-16 h-16 text-red-600 mb-4" />
                    <p className="text-xl font-bold text-[#1e3a8a]">Electric Current</p>
                    <p className="text-5xl font-mono font-bold text-[#1e3a8a] my-4">
                        {motorData.current.toFixed(2)}
                    </p>
                    <p className="text-lg font-bold text-blue-600">A</p>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-[#9ca3af] shadow-md flex flex-col items-center justify-center">
                    <Bolt className="w-16 h-16 text-green-600 mb-4" />
                    <p className="text-xl font-bold text-[#1e3a8a]">Power Consumption</p>
                    <p className="text-5xl font-mono font-bold text-[#1e3a8a] my-4">
                        {displayPower.toFixed(2)}
                    </p>
                    <p className="text-lg font-bold text-blue-600">{getPowerUnitLabel()}</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
