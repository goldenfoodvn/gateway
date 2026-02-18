"use client";
import React, { useState, useEffect } from "react";

// ==== TypeScript types for Transport/Hotel ==== //
type Seat = {
  id: number;
  label: string;
  type: string;
};
type Floor = {
  id: number;
  name: string;
  rows: number;
  cols: number;
  layout: Seat[];
};

export default function PartnerDashboard() {
  // --- TRANSPORT STATES ---
  const [activeTab, setActiveTab] = useState<"transport" | "hotel">("transport");
  const [viewMode, setViewMode] = useState<"partner" | "tourist">("partner"); // "partner" or "tourist"
  const [transportConfig, setTransportConfig] = useState({
    from: "Ha Noi",
    to: "Sapa",
    basePrice: 350000
  });

  const [routePoints, setRoutePoints] = useState([
    { id: 1, name: "168 Ngoc Khanh (VP)", time: "06:30", surcharge: 0, type: "pickup" },
    { id: 2, name: "CV Hoa Binh", time: "07:00", surcharge: 0, type: "pickup" },
    { id: 3, name: "San bay Noi Bai", time: "07:45", surcharge: 50000, type: "pickup" }
  ]);
  
  const [selectedPickup, setSelectedPickup] = useState(1);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  // Matrix Xe
  const [matrixSize, setMatrixSize] = useState({ rows: 5, cols: 3 });
  const [seatLayout, setSeatLayout] = useState<Seat[]>([]);
  const [selectedSeatTool, setSelectedSeatTool] = useState("available");

  useEffect(() => {
    if (seatLayout.length === matrixSize.rows * matrixSize.cols) return;
    const newArr: Seat[] = [];
    for(let i=0; i<matrixSize.rows * matrixSize.cols; i++) {
        let type = "available";
        if ((i + 1) % 3 === 2) type = "none"; 
        if (i === 0) type = "driver";
        if (i === 1) type = "none";
        if (i === 2) type = "available";
        newArr.push({ 
            id: i, 
            label: type === "driver" ? "TX" : type === "none" ? "" : (i + 1).toString(), 
            type: type 
        });
    }
    setSeatLayout(newArr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixSize]);

  const handleSeatClick = (idx: number) => {
    if (viewMode === "tourist") {
        const seat = seatLayout[idx];
        if (seat.type === "none" || seat.type === "driver" || seat.type === "booked") return;
        if (selectedSeat === idx) setSelectedSeat(null);
        else setSelectedSeat(idx);
        return;
    }
    const newLayout = [...seatLayout];
    const isDriver = selectedSeatTool === "driver";
    newLayout[idx] = { 
        ...newLayout[idx], 
        type: selectedSeatTool, 
        label: isDriver ? "TX" : selectedSeatTool === "none" ? "" : (idx + 1).toString()
    };
    setSeatLayout(newLayout);
  };

  const calculateTotal = () => {
    let total = transportConfig.basePrice;
    const pickup = routePoints.find(p => p.id === selectedPickup);
    if (pickup) total += pickup.surcharge;
    if (selectedSeat !== null) {
        const seat = seatLayout[selectedSeat];
        if (seat && seat.type === "vip") total += 100000;
    }
    return total;
  };

  // --- HOTEL STATES ---
  const [floors, setFloors] = useState<Floor[]>([
      { id: 1, name: "Tang 1 (Sanh)", rows: 6, cols: 8, layout: [] },
      { id: 2, name: "Tang 2 (Phong)", rows: 6, cols: 8, layout: [] }
  ]);
  const [currentFloorId, setCurrentFloorId] = useState(2);
  const [selectedArchTool, setSelectedArchTool] = useState("room");

  useEffect(() => {
    const updatedFloors: Floor[] = floors.map(f => {
        if (f.layout.length === f.rows * f.cols) return f;
        const layout: Seat[] = [];
        for(let i=0; i<f.rows * f.cols; i++) {
            layout.push({ id: i, label: "", type: "none" });
        }
        return { ...f, layout };
    });
    const needUpdate = updatedFloors.some((f, i) => f.layout.length !== floors[i].layout.length);
    if (needUpdate) setFloors(updatedFloors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors]);

  const handleArchClick = (idx: number) => {
    const floorIdx = floors.findIndex(f => f.id === currentFloorId);
    const item = floors[floorIdx]?.layout[idx];
    if (!item) return;
    if (viewMode === "tourist") {
        if (item.type === "camera") {
            alert("🔴 VIEW CAMERA THUC TE: \nDang ket noi toi Camera " + item.label + "...");
        } else if (item.type === "room") {
            alert("🛌 CHI TIET PHONG " + item.label + ":\n- Gia: 550,000 VND\n- Trang thai: Con phong");
        }
        return;
    }
    const newFloors = [...floors];
    let label = "";
    if (selectedArchTool === "room") label = "P" + currentFloorId + "0" + (idx + 1);
    if (selectedArchTool === "camera") label = "CAM-" + (idx + 1);
    if (selectedArchTool === "stairs") label = "Thang";
    if (selectedArchTool === "wc") label = "WC";
    newFloors[floorIdx].layout[idx] = { 
        ...newFloors[floorIdx].layout[idx], 
        type: selectedArchTool, 
        label: label 
    };
    setFloors(newFloors);
  };

  const getCurrentFloor = () => floors.find(f => f.id === currentFloorId) || floors[0];

  // --- LOGIN HANDLER ---
  const handleLogin = (provider: string) => {
    window.location.href = `/auth/${provider}`;
  };

  // --- RENDER --- //
  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-800">
      {/* --- Đăng nhập OAuth --- */}
      <div className="w-full max-w-md mx-auto mt-6 mb-4 bg-white p-5 rounded-xl shadow flex flex-col gap-3">
        <h2 className="text-xl font-bold text-blue-600 mb-4 text-center">🔒 Đăng nhập</h2>
        <button onClick={() => handleLogin("google")} className="bg-gradient-to-r from-blue-300 to-blue-600 text-white rounded-lg py-2 font-bold flex items-center gap-2 justify-center shadow hover:scale-105">
          🟦 Đăng nhập với Google
        </button>
        <button onClick={() => handleLogin("github")} className="bg-gradient-to-r from-yellow-300 to-purple-500 text-white rounded-lg py-2 font-bold flex items-center gap-2 justify-center shadow hover:scale-105">
          🐙 Đăng nhập với GitHub
        </button>
        <button onClick={() => handleLogin("facebook")} className="bg-gradient-to-r from-blue-500 to-pink-400 text-white rounded-lg py-2 font-bold flex items-center gap-2 justify-center shadow hover:scale-105">
          🟦 Đăng nhập với Facebook
        </button>
        <button onClick={() => handleLogin("zalo")} className="bg-gradient-to-r from-sky-300 to-blue-500 text-white rounded-lg py-2 font-bold flex items-center gap-2 justify-center shadow hover:scale-105">
          💬 Đăng nhập với Zalo
        </button>
        <button onClick={() => handleLogin("wechat")} className="bg-gradient-to-r from-green-400 to-green-700 text-white rounded-lg py-2 font-bold flex items-center gap-2 justify-center shadow hover:scale-105">
          🟩 Đăng nhập với WeChat
        </button>
      </div>
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-4 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-blue-600">SapaLens <span className="text-slate-400 text-sm font-normal">Partner</span></h1>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab("transport")} className={"px-4 py-2 rounded-md text-sm font-bold transition " + (activeTab === "transport" ? "bg-white shadow text-blue-600" : "text-slate-500")}>🚌 Van Chuyen</button>
                <button onClick={() => setActiveTab("hotel")} className={"px-4 py-2 rounded-md text-sm font-bold transition " + (activeTab === "hotel" ? "bg-white shadow text-blue-600" : "text-slate-500")}>🏨 Luu Tru</button>
            </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode("partner")} className={"px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2 " + (viewMode === "partner" ? "bg-white shadow text-slate-800" : "text-slate-500")}>🛠️ Thiet ke</button>
            <button onClick={() => setViewMode("tourist")} className={"px-4 py-2 rounded-md text-sm font-bold transition flex items-center gap-2 " + (viewMode === "tourist" ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow" : "text-slate-500")}>📱 Xem thu</button>
        </div>
      </div>
    
      {/* ... GIỮ NGUYÊN PHẦN DASHBOARD transport/hotel phía dưới ... */}
      {/* Hãy điền lại phần dashboard logic/main render ở đây nếu cần full nhất, hoặc sử dụng UI hiện tại bạn đã build */}

    </div>
  );
}
