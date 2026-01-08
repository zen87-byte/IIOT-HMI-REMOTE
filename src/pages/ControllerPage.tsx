import React, { useState } from "react";
import MotorToggle, { MotorState } from "@/components/MotorToggle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import UsageHistory from "@/components/UsageHistory";

const ControllerPage = () => {
    const { user } = useAuth();
    const [motorState, setMotorState] = useState<MotorState>("STOP");
    const isOperator = user?.role === "operator";

    const handleMotorToggle = (newState: MotorState) => {
        if (!isOperator) {
            toast.error("Access Denied", {
                description: "Only operators can control the motor",
            });
            return;
        }
        setMotorState(newState);
        toast(newState !== "STOP" ? "Motor Started" : "Motor Stopped");
    };

    return (
        <div className="flex flex-col gap-8 h-full items-center">
            <h2 className="text-2xl font-bold text-[#1e3a8a] self-start border-b-2 border-[#1e3a8a] pb-2">
                Motor Controller
            </h2>

            <div className="bg-white p-12 rounded-lg border-2 border-[#9ca3af] shadow-md flex flex-col items-center gap-6">
                <h3 className="text-xl font-bold text-[#1e3a8a]">Manual Control</h3>
                <MotorToggle
                    state={motorState}
                    onStateChange={handleMotorToggle}
                    disabled={!isOperator}
                />
                <div className="text-center">
                    <p className="text-[#1e3a8a] font-bold">Current Status:</p>
                    <p className={`text-2xl font-black ${motorState === "STOP" ? "text-gray-500" : "text-green-600"}`}>
                        {motorState}
                    </p>
                </div>
            </div>

            <div className="w-full mt-auto">
                <div className="bg-[#cbd5e1] p-2 rounded-t border-[#9ca3af] border-t border-l border-r font-bold text-[#1e3a8a]">
                    Recent Activity
                </div>
                <div className="h-48 overflow-auto border-2 border-[#9ca3af] bg-white rounded-b">
                    <UsageHistory entries={[]} />
                </div>
            </div>
        </div>
    );
};

export default ControllerPage;
