import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    getSupplierData,
    getProductsBySupplier,
} from "../../api/suppliers/supplierApi";
import {
    createPurchaseOrder,
    getWarehouseByProduct,
} from "../../api/purchaseOrder/purchaseOrderApi";

import SupplierSelector from "./CreatePurchaseOrder/SupplierSelector";
import ProductSelector from "./CreatePurchaseOrder/ProductSelector";
import OrderItemList from "./CreatePurchaseOrder/OrderItemList";
import PopupMessage from "./CreatePurchaseOrder/PopupMessage";

import "../../styles/stock/CreateOrderPage.css";

const CreatePurchaseOrderPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [supplierId, setSupplierId] = useState("");
    const [supplierCompany, setSupplierCompany] = useState("");
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState<number>(1);
    const [costPrice, setCostPrice] = useState<number>(0);
    const [salePrice, setSalePrice] = useState<number>(0);
    const [warehouseId, setWarehouseId] = useState("");
    const [warehouseName, setWarehouseName] = useState("");
    const [warehouseCode, setWarehouseCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [popupType, setPopupType] = useState<"success" | "error" | null>(null);

    // 🔹 โหลด Supplier
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const token = localStorage.getItem("token") || "";
                const supRes = await getSupplierData(token);
                setSuppliers(supRes.data || supRes);
            } catch {
                setMessage("❌ โหลด Supplier ไม่สำเร็จ");
                setPopupType("error");
            } finally {
                setLoading(false);
            }
        };
        fetchSuppliers();
    }, []);

    const fetchProductsBySupplier = async (id: string) => {
        const token = localStorage.getItem("token") || "";
        const res = await getProductsBySupplier(id, token);
        const normalized = (res.data || []).map((item: any) => ({
            _id: item.product._id,
            name: item.product.name,
            barcode: item.product.barcode,
            costPrice: item.stock?.costPrice || 0,
            salePrice: item.stock?.salePrice || 0,
            totalQuantity: item.stock?.totalQuantity || 0,
        }));
        setProducts(normalized);
    };

    const fetchWarehouseByProduct = async (productId: string) => {
        const token = localStorage.getItem("token") || "";
        const data = await getWarehouseByProduct(productId, token);
        if (data.success && data.data?.location?._id) {
            setWarehouseId(data.data.location._id);
            setWarehouseName(data.data.location.name);
            setWarehouseCode(data.data.location.code);
        }
    };

    const handleAddItem = () => {
        if (!productId || quantity <= 0 || costPrice <= 0) {
            setMessage("⚠️ กรุณากรอกข้อมูลให้ครบ");
            setPopupType("error");
            return;
        }
        const selected = products.find((p) => p._id === productId);
        if (!selected) return;
        const exists = items.find((i) => i.productId === productId);
        if (exists) {
            setMessage("⚠️ มีสินค้านี้ในรายการแล้ว");
            setPopupType("error");
            return;
        }
        setItems((prev) => [
            ...prev,
            {
                productId,
                productName: selected.name,
                barcode: selected.barcode,
                quantity,
                costPrice,
                salePrice,
            },
        ]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter((item) => item.productId !== id));
    };

    const handleSubmit = async () => {
        if (!supplierId || items.length === 0) {
            setMessage("⚠️ กรุณาเลือก Supplier และเพิ่มสินค้าอย่างน้อย 1 รายการ");
            setPopupType("error");
            return;
        }

        const token = localStorage.getItem("token") || "";
        const payload = {
            purchaseOrderNumber: `PO-${new Date().getFullYear()}-${Date.now()}`,
            supplierId,
            supplierCompany,
            location: warehouseId,
            items,
        };

        const res = await createPurchaseOrder(payload, token);
        if (res.success) {
            setMessage("✅ สร้างใบสั่งซื้อสำเร็จ!");
            setPopupType("success");
            setItems([]);
        } else {
            setMessage(res.message || "❌ สร้างใบสั่งซื้อไม่สำเร็จ");
            setPopupType("error");
        }
    };

    if (loading) return <p>⏳ กำลังโหลดข้อมูล...</p>;

    return (
        <div className="create-order-container-suppliers">
            <div className="create-order-header-suppliers">
            <h2>สร้างใบสั่งซื้อ (Purchase Order)</h2>
            </div>
            {message && <p>{message}</p>}

            <SupplierSelector
                suppliers={suppliers}
                supplierId={supplierId}
                setSupplierId={setSupplierId}
                setSupplierCompany={setSupplierCompany}
                fetchProductsBySupplier={fetchProductsBySupplier}
            />

            {supplierId && (
                <ProductSelector
                    products={products}
                    productId={productId}
                    setProductId={setProductId}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    costPrice={costPrice}
                    setCostPrice={setCostPrice}
                    salePrice={salePrice}
                    setSalePrice={setSalePrice}
                    warehouseName={warehouseName}
                    warehouseCode={warehouseCode}
                    fetchWarehouseByProduct={fetchWarehouseByProduct}
                    handleAddItem={handleAddItem}
                />
            )}

            <OrderItemList items={items} handleRemoveItem={handleRemoveItem} />

            <button className="create-po-btn" onClick={handleSubmit}>
                ✅ สร้างใบสั่งซื้อ
            </button>

            {popupType && (
                <PopupMessage
                    type={popupType}
                    message={message}
                    onClose={() => setPopupType(null)}
                    onConfirmNavigate={() => navigate("/purchase-orders")}
                />
            )}
        </div>
    );
};

export default CreatePurchaseOrderPage;
