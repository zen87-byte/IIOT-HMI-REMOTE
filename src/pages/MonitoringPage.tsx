import React, { useState } from "react";
import RealtimeChart from "@/components/RealtimeChart";
import useMotorData from "@/hooks/useMotorData";
import { useAlarms } from "@/hooks/useAlarms";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import TimeRangeSelector, { TimeRange } from "@/components/TimeRangeSelector";

const MonitoringPage = () => {
    const [timeRange, setTimeRange] = useState<TimeRange>("live");
    const motorData = useMotorData(true, timeRange);
    const { thresholds } = useAlarms(
        motorData.current,
        motorData.rpm,
        motorData.voltage,
        true
    );
    const { getSpeedUnitLabel, getPowerUnitLabel, convertPower } = useUnitConversion();

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#1e3a8a] border-b-2 border-[#1e3a8a] pb-2">
                    Real-time Monitoring
                </h2>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="bg-white p-4 rounded border-2 border-[#9ca3af] h-[300px]">
                    <RealtimeChart
                        title="Voltage"
                        data={motorData.voltageHistory}
                        unit="V"
                        color="#ca8a04"
                        minValue={200}
                        maxValue={250}
                    />
                </div>
                <div className="bg-white p-4 rounded border-2 border-[#9ca3af] h-[300px]">
                    <RealtimeChart
                        title="Electric Current"
                        data={motorData.currentHistory}
                        unit="A"
                        color="#dc2626"
                        minValue={0}
                        maxValue={5}
                    />
                </div>
                <div className="bg-white p-4 rounded border-2 border-[#9ca3af] h-[300px]">
                    <RealtimeChart
                        title="Motor Speed"
                        data={motorData.rpmHistory}
                        unit={getSpeedUnitLabel()}
                        color="#2563eb"
                        minValue={0}
                        maxValue={2500}
                    />
                </div>
                <div className="bg-white p-4 rounded border-2 border-[#9ca3af] h-[300px]">
                    <RealtimeChart
                        title="Power Consumption"
                        data={motorData.powerHistory.map(p => ({
                            time: p.time,
                            value: convertPower(p.value)
                        }))}
                        unit={getPowerUnitLabel()}
                        color="#16a34a"
                        minValue={0}
                        maxValue={2000}
                    />
                </div>
            </div>
        </div>
    );
};

export default MonitoringPage;
