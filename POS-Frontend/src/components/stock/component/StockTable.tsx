import React from "react";


interface StockTableProps {
    stock: any[];
    getLocationName: (location: any) => string;
    getCategoryNameById: (id: string) => string;
    formatThaiDateTime: (date: string) => string;
    getStatusIcon: (status: string) => string;
    handleRowClick: (barcode: string) => void;
}

const StockTable: React.FC<StockTableProps> = ({
    stock,
    getLocationName,
    getCategoryNameById,
    formatThaiDateTime,
    getStatusIcon,
    handleRowClick,
}) => {
    return (
        <table className="stock-table">
            <thead>
                <tr className="stock-header-row">
                    <th className="stock-header-cell">ลำดับ</th>
                    <th className="stock-header-cell">สินค้า</th>
                    <th className="stock-header-cell">รูปภาพ</th>
                    <th className="stock-header-cell">ราคาทุน</th>
                    <th className="stock-header-cell">ราคาขาย</th>
                    <th className="stock-header-cell">จำนวน</th>
                    <th className="stock-header-cell">คลังสินค้า</th>
                    <th className="stock-header-cell">ซัพพลายเออร์</th>
                    <th className="stock-header-cell">สถานะ</th>
                    <th className="stock-header-cell">หมวดหมู่</th>
                    <th className="stock-header-cell">อัพเดทล่าสุด</th>
                </tr>
            </thead>
            <tbody>
                {stock.length > 0 ? (
                    stock.map((item, index) => {
                        const product = item.productId;
                        return (
                            <tr
                                key={item.barcode}
                                className="clickable-row"
                                onClick={() => handleRowClick(item.barcode)}
                            >
                                <td className="stock-cell">{index + 1}</td>
                                <td className="stock-cell">{product?.name || "ไม่พบสินค้า"}</td>
                                <td className="stock-cell">
                                    {product?.imageUrl ? (
                                        <img src={product.imageUrl} className="product-image" />
                                    ) : (
                                        "ไม่มีรูป"
                                    )}
                                </td>
                                {/* ✅ แสดงราคาจาก Stock */}
                                <td className="stock-cell">
                                    {item.costPrice ? `${item.costPrice.toLocaleString()} บาท` : "-"}
                                </td>
                                <td className="stock-cell">
                                    {item.salePrice ? `${item.salePrice.toLocaleString()} บาท` : "-"}
                                </td>
                                <td className="stock-cell">{item.quantity}</td>
                                <td className="stock-cell">
                                    {item.location ? getLocationName(item.location) : "ไม่ทราบที่เก็บ"}
                                </td>
                                <td className="stock-cell">
                                    {item.supplierId?.companyName || item.supplier || "-"}
                                </td>
                                <td className="stock-cell status-cell">
                                    {getStatusIcon(item.status)} {item.status}
                                </td>
                                <td className="stock-cell">
                                    {item.productId?.category?.name || "ไม่ทราบหมวดหมู่"}
                                </td>
                                <td className="stock-cell">{formatThaiDateTime(item.updatedAt)}</td>
                            </tr>
                        );
                    })
                ) : (
                    <tr>
                        <td colSpan={11} className="stock-no-data">
                            🔍 ไม่พบข้อมูลสินค้าในร้านของคุณ
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

export default StockTable;
