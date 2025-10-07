import React from "react";
import { Category } from "../../types/productTypes";

interface NumberPadProps {
    currentQuantity: string;
    handleQuantityChange: (value: string) => void;
    handleDeleteOne: () => void;
    handleClear: () => void;
    handleSetQuantity: () => void;
    setShowNumberPad: (val: boolean) => void;
    numpadErrorMessage: string;
}

const NumberPad: React.FC<NumberPadProps> = ({
    currentQuantity,
    handleQuantityChange,
    handleDeleteOne,
    handleClear,
    handleSetQuantity,
    setShowNumberPad,
    numpadErrorMessage,
}) => (
    <div className="numpad-overlay">
        <div className="numpad-product">
            <button onClick={() => setShowNumberPad(false)} className="numpad-product-close">
                &times;
            </button>
            <div className="numpad-product-display">
                {numpadErrorMessage ? (
                    <p className="numpad-product-error">{numpadErrorMessage}</p>
                ) : (
                    <p>จำนวน: {currentQuantity}</p>
                )}
            </div>
            <div className="numpad-product-buttons">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((b) => (
                    <button key={b} onClick={() => handleQuantityChange(b)} className="numpad-product-btn">
                        {b}
                    </button>
                ))}
                <button onClick={handleDeleteOne} className="numpad-product-clear-one">⬅</button>
                <button onClick={handleClear} className="numpad-product-clear">AC</button>
            </div>
            <button onClick={handleSetQuantity} className="numpad-product-set">
                เลือก
            </button>
        </div>
    </div>
);

export default NumberPad;
