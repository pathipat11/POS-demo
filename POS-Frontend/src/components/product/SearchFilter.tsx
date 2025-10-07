import React, { useRef, useState, useEffect } from "react";
import { Category, Product } from "../../types/productTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBarcode } from "@fortawesome/free-solid-svg-icons";
import { getCategories } from "../../api/product/categoryApi"; // ✅ ดึง API

interface SearchFilterProps {
    searchProduct: string;
    setSearchProduct: (value: string) => void;
    categoryFilter: string;
    setCategoryFilter: (value: string) => void;
    isSidebarOpen: boolean;
    products: Product[];
    addToCart: (product: Product) => void;
    onProductNotFound: () => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
    searchProduct,
    setSearchProduct,
    categoryFilter,
    setCategoryFilter,
    isSidebarOpen,
    products,
    addToCart,
    onProductNotFound,
}) => {
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // ✅ โหลดหมวดหมู่จาก API
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const res = await getCategories(token);
                if (res.success && Array.isArray(res.data)) {
                    setCategories(res.data);
                }
            } catch (err) {
                console.error("❌ โหลดหมวดหมู่ไม่สำเร็จ:", err);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    // ✅ เปิด-ปิดโหมดสแกนบาร์โค้ด
    const handleScanClick = () => {
        setIsScannerActive((prev) => !prev);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // ✅ กด Enter → ค้นหา/เพิ่มสินค้า
    const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const found = products.find(
                (p) =>
                    p.barcode.toLowerCase() === searchProduct.trim().toLowerCase() ||
                    p.name.toLowerCase().includes(searchProduct.toLowerCase())
            );

            if (found) {
                addToCart(found);
                setSearchProduct("");
                inputRef.current?.focus();
            } else {
                onProductNotFound();
            }
        }
    };

    return (
        <div className={`search-wrapper ${!isSidebarOpen ? "sidebar-closed-margin" : ""}`}>
            <div className="searchproduct-container">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                        isScannerActive ? "📡 รอสแกนบาร์โค้ด..." : "🔍 ค้นหาสินค้าหรือยิงบาร์โค้ด..."
                    }
                    className={`searchproduct-input ${isScannerActive ? "scanner-active" : ""}`}
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    onKeyDown={handleSearchEnter}
                    autoFocus={isScannerActive}
                />

                <select
                    className="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    disabled={loadingCategories}
                >
                    <option value="">📦 ทุกหมวดหมู่</option>
                    {loadingCategories ? (
                        <option disabled>⏳ กำลังโหลดหมวดหมู่...</option>
                    ) : (
                        categories.map((category) => (
                            <option key={category._id} value={category._id}>
                                {category.name}
                            </option>
                        ))
                    )}
                </select>

                <button
                    className={`barcode-scan-btn ${isScannerActive ? "active" : ""}`}
                    onClick={handleScanClick}
                >
                    <FontAwesomeIcon icon={faBarcode} className="barcode-icon" />
                    {isScannerActive ? "กำลังสแกน..." : "ใช้เครื่องสแกน"}
                </button>
            </div>
        </div>
    );
};

export default SearchFilter;
