import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "../../styles/page/POSDashboard.css";
import { fetchSalesSummary } from "../../api/receipt/receiptApi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TimeFrameData {
  totalSales: number;
  totalQuantity: number;
  netSales: number;
  totalProfit: number;
  bestSeller: {
    name: string;
    quantity: number;
    revenue: number;
  };
  formattedDate: {
    thai: string;
    iso: string;
  };
}

interface DashboardData {
  daily: TimeFrameData[];
  weekly: TimeFrameData[];
  monthly: TimeFrameData[];
}

// ✅ ฟังก์ชัน format label ตาม filter
function formatLabel(dateString: string, filter: "daily" | "weekly" | "monthly"): string {
  const date = new Date(dateString);
  if (filter === "daily") {
    return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function SalesSummary() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly">("weekly");

  useEffect(() => {
    const getSummary = async () => {
      try {
        const res = await fetchSalesSummary();
        if (res.success) {
          setDashboardData(res.data);
        } else {
          setError("ไม่สามารถดึงข้อมูลได้");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };
    getSummary();
  }, []);

  if (loading) return <p>⏳ กำลังโหลดข้อมูล...</p>;
  if (error) return <p className="error-text">❌ {error}</p>;
  if (!dashboardData) return <p>ไม่พบข้อมูล</p>;

  const selectedData = dashboardData[filter];

  // ✅ รวมค่าทั้งหมด
  const totalSales = selectedData.reduce((sum, d) => sum + d.totalSales, 0);
  const totalQuantity = selectedData.reduce((sum, d) => sum + d.totalQuantity, 0);
  const totalProfit = selectedData.reduce((sum, d) => sum + d.totalProfit, 0);
  const netSales = selectedData.reduce((sum, d) => sum + d.netSales, 0);

  // ✅ หา best seller (fallback เป็น "-")
  const bestSeller = selectedData.reduce(
    (best, d) => (d.bestSeller && d.bestSeller.quantity > best.quantity ? d.bestSeller : best),
    { name: "-", quantity: 0, revenue: 0 }
  );

  // ✅ ทำข้อมูลสำหรับกราฟ
  const salesData = {
    labels: selectedData.map((d) => formatLabel(d.formattedDate.iso, filter)),
    datasets: [
      {
        label: "ยอดขาย (บาท)",
        data: selectedData.map((d) => d.totalSales),
        borderColor: "#6c5ce7",
        backgroundColor: "rgba(108, 92, 231, 0.2)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#00cec9",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: {
        display: true,
        text:
          filter === "daily"
            ? "ยอดขายรายชั่วโมงวันนี้"
            : filter === "weekly"
              ? "ยอดขายรายวันสัปดาห์นี้"
              : "ยอดขายรายวันเดือนนี้",
        font: { size: 18 },
        color: "#2d3436",
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `฿${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: { type: "category" as const },
      y: {
        type: "linear" as const,
        beginAtZero: true,
        ticks: {
          callback: function (value: string | number) {
            return typeof value === "number" ? `฿${value.toLocaleString()}` : value;
          },
        },
      },
    },
  };

  return (
    <div className="display">
      <div className="report-sale-container">
        <header className="report-sale-header">
          <h1 className="report-sale-title">📊 รายงานยอดขาย</h1>
        </header>

        <div className="filter-buttons">
          <button className={filter === "daily" ? "active" : ""} onClick={() => setFilter("daily")}>
            รายวัน
          </button>
          <button className={filter === "weekly" ? "active" : ""} onClick={() => setFilter("weekly")}>
            รายสัปดาห์
          </button>
          <button className={filter === "monthly" ? "active" : ""} onClick={() => setFilter("monthly")}>
            รายเดือน
          </button>
        </div>

        {/* ✅ summary cards */}
        <section className="report-sale-summary">
          <div className="summary-card">
            <h3>ยอดขายรวม</h3>
            <p>฿{totalSales.toLocaleString()}</p>
          </div>
          <div className="summary-card">
            <h3>จำนวนที่ขายได้</h3>
            <p>{totalQuantity.toLocaleString()} ชิ้น</p>
          </div>
          <div className="summary-card profit">
            <h3>กำไรรวม</h3>
            <p>฿{totalProfit.toLocaleString()}</p>
          </div>
          <div className="summary-card">
            <h3>สินค้าขายดี</h3>
            <p>{bestSeller.name}</p>
            <small>{bestSeller.quantity.toLocaleString()} ชิ้น</small>
            <small className="revenue">฿{bestSeller.revenue.toLocaleString()}</small>
          </div>
        </section>

        {/* ✅ chart */}
        <main className="report-sale-main">
          <section className="report-sale-chart">
            <Line data={salesData} options={options} />
          </section>
        </main>
      </div>
    </div>
  );
}
