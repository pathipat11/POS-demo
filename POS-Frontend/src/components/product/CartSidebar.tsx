import React from "react";
import { Product } from "../../types/productTypes";

interface CartSidebarProps {
    cart: Product[];
    isSidebarOpen: boolean;
    clearCart: () => void;
    removeFromCart: (item: Product, barcode: string) => void;
    openNumberPad: (qty: number, barcode: string) => void;
    getTotalPrice: () => number;
    setShowCheckout: (val: boolean) => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({
    cart,
    isSidebarOpen,
    clearCart,
    removeFromCart,
    openNumberPad,
    getTotalPrice,
    setShowCheckout,
}) => (
    <div
        className={`cart ${cart.length > 0 ? "show-cart" : "hidden-cart"} ${isSidebarOpen ? "cart-collapse" : "cart-expand"
            }`}
    >
        <p className="cart-summary">
            รวมทั้งหมด: {cart.reduce((sum, i) => sum + i.quantity, 0)} รายการ
        </p>

        <h2 className="cart-title">ตะกร้าสินค้า</h2>
        <button onClick={clearCart} className="clear-cart-btn">เคลียตะกร้า</button>

        <div className="cart-items">
            {cart.map((item) => (
                <div key={item.barcode} className="cart-item">
                    <img src={item.imageUrl} alt={item.name} className="cart-item-img" />
                    <div className="cart-item-info">
                        <p className="cart-item-name">{item.name}</p>
                        <p className="cart-item-quantity">จำนวน: {item.quantity}</p>
                        <p className="cart-item-price">
                            ราคา: {(item.price * item.quantity).toLocaleString()} ฿
                        </p>
                        <button
                            onClick={() => openNumberPad(item.quantity, item.barcode)}
                            className="edit-quantity-btn"
                        >
                            แก้ไขจำนวน
                        </button>
                    </div>
                    <button onClick={() => removeFromCart(item, item.barcode)} className="remove-btn">
                        ลบสินค้า
                    </button>
                </div>
            ))}
        </div>

        <div className="cart-total">
            <p>
                ยอดรวม: <span>{getTotalPrice().toLocaleString()} ฿</span>
            </p>
        </div>

        <div className="checkout">
            <button onClick={() => setShowCheckout(true)} className="checkout-btn">
                ชำระเงิน
            </button>
        </div>
    </div>
);

export default CartSidebar;
