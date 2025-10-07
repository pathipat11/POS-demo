import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

// 🧩 Components
import SearchFilter from "./SearchFilter";
import ProductGrid from "./ProductGrid";
import CartSidebar from "./CartSidebar";
import NumberPad from "./NumberPad";
import StockErrorDialog from "./StockErrorDialog";
import Checkout from "../payment/Checkout";
import { Product, StockItem, Category } from "../../types/productTypes";

// 🧠 APIs
import { getProducts } from "../../api/product/productApi";
import { getStockData, createOrder } from "../../api/stock/stock";
import { createPayment } from "../../api/payment/paymentApi";
import { getCategories } from "../../api/product/categoryApi";

// 🎨 Styles
import "../../styles/product/ProductList.css";

interface CartProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const ProductList: React.FC<CartProps> = ({ isSidebarOpen }) => {
  // ======================= States =======================
  const [user, setUser] = useState<{ userId: string; username: string; role: string; email: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [popupVisible, setPopupVisible] = useState(false);
  const [errorType, setErrorType] = useState<"outOfStock" | "notFound">("outOfStock");

  // Search + Filter
  const [searchProduct, setSearchProduct] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // NumberPad
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [selectedProductBarcode, setSelectedProductBarcode] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("1");
  const [numpadErrorMessage, setNumpadErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Checkout
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStockError, setShowStockError] = useState(false);

  // ======================= Effects =======================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          email: decoded.email,
        });
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const wrapper = document.querySelector(".search-wrapper");
      if (window.scrollY > 20) wrapper?.classList.add("scrolled");
      else wrapper?.classList.remove("scrolled");
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        // 🧱 STEP 1: โหลด Stock ก่อน
        const stock = await getStockData(token);
        const mappedStock: StockItem[] = stock.map((item: any) => ({
          barcode: item.barcode,
          quantity: item.quantity,
          status: item.status,
          supplier: item.supplier,
          costPrice: item.costPrice,   // 💰 ราคาทุน
          salePrice: item.salePrice,   // 💸 ราคาขาย
          productId: {
            _id: item.productId?._id,
            name: item.productId?.name || "",
            price: item.salePrice || item.productId?.price || 0,
            barcode: item.productId?.barcode || "",
            imageUrl: item.productId?.imageUrl || "",
            category: {
              _id: item.productId?.category?._id,
              name: item.productId?.category?.name || "",
            },
          },
        }));
        setStockData(mappedStock);

        // 🧱 STEP 2: โหลด Products แล้ว match กับ stock
        const res = await getProducts();
        if (res.success && Array.isArray(res.data)) {
          const mappedProducts = res.data.map((item: any) => {
            const stockItem = mappedStock.find(
              (s) => s.productId?._id === item.productId?._id
            );
            console.log("📦 Loaded Sale Price:", stockItem?.salePrice, "for", item.productId?.name);
            return {
              _id: item.productId?._id,
              barcode: item.productId?.barcode || "",
              name: item.productId?.name || "",
              price: stockItem?.salePrice || item.productId?.price || 0, // ✅ ใช้ salePrice
              costPrice: stockItem?.costPrice || 0,
              quantity: stockItem?.quantity || 0,
              category: {
                _id: item.productId?.category?._id || "",
                name: item.productId?.category?.name || "",
              },
              imageUrl: item.productId?.imageUrl || "",
            };
          });
          setProducts(mappedProducts);
        } else {
          setErrorMessage("ไม่พบข้อมูลสินค้า");
        }

        // 🧱 STEP 3: โหลด Category
        const categoryRes = await getCategories(token);
        if (categoryRes.success && Array.isArray(categoryRes.data)) {
          setCategories(categoryRes.data);
        }
      } catch (err) {
        console.error("❌ โหลดข้อมูลล้มเหลว:", err);
        setErrorMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // ======================= Handlers =======================
  const addToCart = (product: Product) => {
    const productStock = stockData.find(item => item.barcode === product.barcode);
    const currentCartItem = cart.find(item => item.barcode === product.barcode);
    const currentQtyInCart = currentCartItem ? currentCartItem.quantity : 0;

    if (productStock && currentQtyInCart + 1 > productStock.quantity) {
      setShowStockError(true);
      setErrorType("outOfStock");
      return;
    }

    setCart((prevCart) => {
      const existingProduct = prevCart.find((item) => item.barcode === product.barcode);
      if (existingProduct) {
        return prevCart.map((item) =>
          item.barcode === product.barcode
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (item: Product, barcode: string) =>
    setCart((prev) => prev.filter((i) => i.barcode !== barcode));

  const clearCart = () => setCart([]);

  const handleProductNotFound = () => {
    setErrorType("notFound");
    setShowStockError(true);
  };

  const openNumberPad = (initialQty: number) => {
    setCurrentQuantity(initialQty.toString());
    setErrorMessage("");
    setIsEditing(false);
    setShowNumberPad(true);
    setNumpadErrorMessage("");
  };

  const handleQuantityChange = (value: string) => {
    setErrorMessage("");
    setCurrentQuantity((prev) => {
      if (!isEditing || prev === "0") {
        setIsEditing(true);
        return value;
      } else {
        return prev + value;
      }
    });
  };

  const handleDeleteOne = () => setCurrentQuantity((prev) => prev.slice(0, -1) || "0");
  const handleClear = () => setCurrentQuantity("0");

  const handleSetQuantity = () => {
    const value = parseInt(currentQuantity, 10);
    if (isNaN(value) || value <= 0) return;

    const stock = stockData.find((s) => s.barcode === selectedProductBarcode);
    if (stock && value > stock.quantity) {
      setNumpadErrorMessage("❌ สินค้าในคลังไม่พอ");
      return;
    }

    setCart((prev) =>
      prev.map((i) =>
        i.barcode === selectedProductBarcode ? { ...i, quantity: value } : i
      )
    );
    setShowNumberPad(false);
  };

  const getTotalPrice = () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const checkout = async (
    amountReceived: number,
    method: "เงินสด" | "โอนเงิน" | "บัตรเครดิต" | "QR Code"
  ) => {
    if (!user) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนทำรายการ");
      return;
    }

    const orderData = {
      saleId: new Date().getTime().toString(),
      userId: user.userId,
      items: cart.map((i) => ({
        productId: i._id,
        barcode: i.barcode,
        name: i.name,
        price: i.price, // ✅ ใช้ salePrice
        quantity: i.quantity,
        subtotal: i.price * i.quantity,
      })),
      paymentMethod: method,
      amount: getTotalPrice(),
      amountReceived,
      change: amountReceived - getTotalPrice(),
    };

    try {
      const orderRes = await createOrder(orderData);
      if (!orderRes.success) throw new Error(orderRes.message);

      const paymentRes = await createPayment({
        saleId: orderData.saleId,
        employeeName: user.username,
        paymentMethod: method,
        amount: getTotalPrice(),
        amountReceived,
        change: amountReceived - getTotalPrice(),
        items: orderData.items,
      });

      if (!paymentRes.success) throw new Error(paymentRes.message);

      setPopupVisible(true);
      setCart([]);
      setTimeout(() => setShowCheckout(false), 200);
    } catch (err) {
      setErrorMessage("💥 เกิดข้อผิดพลาดในการชำระเงิน");
      console.error(err);
    }
  };

  // ======================= Filter =======================
  const filteredProducts = products.filter((p) => {
    const matchName = p.name.toLowerCase().includes(searchProduct.toLowerCase());
    const matchCategory = !categoryFilter || p.category._id === categoryFilter;
    return matchName && matchCategory;
  });

  // ======================= Render =======================
  return (
    <div className="display">
      <div className="search-wrapper">
        <SearchFilter
          searchProduct={searchProduct}
          setSearchProduct={setSearchProduct}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          isSidebarOpen={isSidebarOpen}
          products={products}
          addToCart={addToCart}
          onProductNotFound={handleProductNotFound}
        />
      </div>

      <div className="product-content-area">
        <ProductGrid
          products={products}
          filteredProducts={filteredProducts}
          cart={cart}
          addToCart={addToCart}
          errorMessage={errorMessage}
          loading={loading}
          searchProduct={searchProduct}
          categoryFilter={categoryFilter}
        />
      </div>

      <CartSidebar
        cart={cart}
        isSidebarOpen={isSidebarOpen}
        clearCart={clearCart}
        removeFromCart={removeFromCart}
        openNumberPad={openNumberPad}
        getTotalPrice={getTotalPrice}
        setShowCheckout={setShowCheckout}
      />

      <StockErrorDialog
        show={showStockError}
        onClose={() => setShowStockError(false)}
        messageType={errorType}
      />

      {showCheckout && (
        <Checkout
          cart={cart}
          totalPrice={getTotalPrice()}
          onClose={() => setShowCheckout(false)}
          checkout={checkout}
          onConfirmPayment={() => { }}
        />
      )}

      {showNumberPad && (
        <NumberPad
          currentQuantity={currentQuantity}
          handleQuantityChange={handleQuantityChange}
          handleDeleteOne={handleDeleteOne}
          handleClear={handleClear}
          handleSetQuantity={handleSetQuantity}
          setShowNumberPad={setShowNumberPad}
          numpadErrorMessage={numpadErrorMessage}
        />
      )}

      {popupVisible && (
        <div className="payment-popup-overlay" onClick={() => setPopupVisible(false)}>
          <div className="payment-popup" onClick={(e) => e.stopPropagation()}>
            <h2>✅ ชำระเงินสำเร็จ!</h2>
            <p>ขอบคุณที่ใช้บริการ 🎉</p>
            <button className="payment-popup-close" onClick={() => setPopupVisible(false)}>
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
