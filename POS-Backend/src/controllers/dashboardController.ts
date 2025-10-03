import { Request, Response } from "express";
import Receipt from "../models/Receipt";
import Stock from "../models/Stock";

// Helper: Format วันไทย
function formatThaiDate(date: Date) {
    return {
        thai: date.toLocaleString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
        }),
        iso: date.toISOString(),
    };
}

// เติมชั่วโมงที่ไม่มีขาย (0 บาท)
function fillHours(data: any[], start: Date) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((h) => {
        const found = data.find((d) => d.hour === h);
        const date = new Date(start);
        date.setHours(h, 0, 0, 0);
        return {
            hour: h,
            totalSales: found ? found.totalSales : 0,
            totalQuantity: found ? found.totalQuantity : 0,
            netSales: found ? found.netSales : 0,
            totalProfit: found ? found.totalProfit : 0,
            bestSeller: found ? found.bestSeller : { name: "-", quantity: 0, revenue: 0 },
            formattedDate: formatThaiDate(date),
        };
    });
}

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();

        // Daily = 24 ชั่วโมง
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dailyRaw = await aggregateSales(startOfDay, now, "hour");
        const dailyData = fillHours(dailyRaw, startOfDay);

        // Weekly = 7 วัน
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        const weeklyData = await aggregateSales(startOfWeek, now, "day");

        // Monthly = รายวันในเดือนนี้
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyData = await aggregateSales(startOfMonth, now, "day");

        // ✅ Summary รวม
        const summary = {
            daily: makeSummary(dailyData),
            weekly: makeSummary(weeklyData),
            monthly: makeSummary(monthlyData),
        };

        // ✅ TopProducts
        const topProducts = {
            daily: getTopProducts(dailyData),
            weekly: getTopProducts(weeklyData),
            monthly: getTopProducts(monthlyData),
        };

        // ✅ ByEmployee
        const byEmployee = {
            daily: await aggregateByEmployee(startOfDay, now),
            weekly: await aggregateByEmployee(startOfWeek, now),
            monthly: await aggregateByEmployee(startOfMonth, now),
        };

        res.status(200).json({
            success: true,
            data: {
                daily: dailyData,
                weekly: weeklyData,
                monthly: monthlyData,
                summary,
                topProducts,
                byEmployee,
            },
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard",
        });
    }
};

// =======================================
// Aggregate Sales (daily/hourly, weekly, monthly)
// =======================================
export async function aggregateSales(start: Date, end: Date, groupBy: "hour" | "day") {
    const stocks = await Stock.find({}).lean();
    const stockMap = new Map(
        stocks.map((s) => [
            s.barcode,
            { costPrice: s.costPrice || 0, salePrice: s.salePrice || 0 },
        ])
    );

    const receipts = await Receipt.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        {
            $group: {
                _id: {
                    bucket:
                        groupBy === "hour"
                            ? { hour: { $hour: { date: "$timestamp", timezone: "Asia/Bangkok" } } }
                            : {
                                year: { $year: { date: "$timestamp", timezone: "Asia/Bangkok" } },
                                month: { $month: { date: "$timestamp", timezone: "Asia/Bangkok" } },
                                day: { $dayOfMonth: { date: "$timestamp", timezone: "Asia/Bangkok" } },
                            },
                    product: "$items.name",
                    barcode: "$items.barcode",
                },
                totalSales: { $sum: "$items.subtotal" },
                totalQuantity: { $sum: "$items.quantity" },
            }
        },
        {
            $group: {
                _id: "$_id.bucket",
                totalSales: { $sum: "$totalSales" },
                totalQuantity: { $sum: "$totalQuantity" },
                products: {
                    $push: {
                        name: "$_id.product",
                        barcode: "$_id.barcode",
                        quantity: "$totalQuantity",
                        revenue: "$totalSales",
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return receipts.map((r) => {
        let date: Date;

        if (groupBy === "hour" && (r._id as any)?.hour !== undefined) {
            date = new Date(start);
            date.setHours((r._id as any).hour, 0, 0, 0);
        } else if (groupBy === "day" && (r._id as any)?.year) {
            const { year, month, day } = r._id as any;
            date = new Date(year, month - 1, day);
        } else {
            date = new Date();
        }

        let totalProfit = 0;
        if (Array.isArray(r.products)) {
            r.products.forEach((p: any) => {
                const stock = stockMap.get(p.barcode);
                if (stock) {
                    const itemProfit = (stock.salePrice - stock.costPrice) * p.quantity;
                    totalProfit += itemProfit;
                }
            });
        }

        let bestSeller = { name: "-", quantity: 0, revenue: 0, barcode: "" };
        if (Array.isArray(r.products) && r.products.length > 0) {
            bestSeller = r.products.reduce(
                (best: any, p: any) => (p.quantity > best.quantity ? p : best),
                bestSeller
            );
        }

        return {
            totalSales: r.totalSales,
            totalQuantity: r.totalQuantity,
            netSales: r.totalSales,
            totalProfit,
            bestSeller,
            products: r.products || [],
            formattedDate: formatThaiDate(date),
            hour: (r._id as any).hour ?? null,
        };
    });
}

// =======================================
// Summary รวม
// =======================================
function makeSummary(data: any[]) {
    const totalSales = data.reduce((s, d) => s + d.totalSales, 0);
    const totalQuantity = data.reduce((s, d) => s + d.totalQuantity, 0);
    const totalProfit = data.reduce((s, d) => s + d.totalProfit, 0);
    const netSales = data.reduce((s, d) => s + d.netSales, 0);

    return { totalSales, totalQuantity, totalProfit, netSales };
}

// =======================================
// TopProducts (รวมทุก bucket)
// =======================================
function getTopProducts(data: any[]) {
    const productMap: any = {};

    data.forEach((d) => {
        if (!d.products || !Array.isArray(d.products)) return;

        d.products.forEach((p: any) => {
            if (!productMap[p.name]) {
                productMap[p.name] = { ...p };
            } else {
                productMap[p.name].quantity += p.quantity;
                productMap[p.name].revenue += p.revenue;
            }
        });
    });

    return Object.values(productMap)
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);
}

// =======================================
// ByEmployee
// =======================================
async function aggregateByEmployee(start: Date, end: Date) {
    const receipts = await Receipt.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: "$employeeName",
                totalSales: { $sum: "$totalPrice" },
                count: { $sum: 1 },
            },
        },
        { $sort: { totalSales: -1 } },
    ]);

    return receipts.map((r) => ({
        employee: r._id,
        totalSales: r.totalSales,
        count: r.count,
    }));
}
