import React from "react";

interface StockErrorDialogProps {
    show: boolean;
    onClose: () => void;
    messageType?: "outOfStock" | "notFound"; // ✅ เพิ่มประเภทข้อความ
}

const StockErrorDialog: React.FC<StockErrorDialogProps> = ({
    show,
    onClose,
    messageType = "outOfStock", // default = ไม่พอในคลัง
}) => {
    if (!show) return null;

    const getTitle = () => {
        if (messageType === "notFound") return "🔎 ไม่พบสินค้า";
        return "❌ สินค้าไม่เพียงพอ";
    };

    const getMessage = () => {
        if (messageType === "notFound")
            return "ไม่พบสินค้านี้ในระบบ กรุณาตรวจสอบบาร์โค้ดหรือชื่อสินค้าอีกครั้ง";
        return "จำนวนสินค้าที่คุณเลือกมีมากกว่าที่มีในคลัง";
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
                <h2 className="dialog-title">{getTitle()}</h2>
                <p className="dialog-message">{getMessage()}</p>
                <button className="dialog-button" onClick={onClose}>
                    ปิด
                </button>
            </div>
        </div>
    );
};

export default StockErrorDialog;
