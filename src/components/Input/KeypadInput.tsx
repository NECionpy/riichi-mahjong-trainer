import React, { useState } from "react";

import "./KeypadInput.less";

interface KeypadInputProps {
  value?: string;
  onChange?: (val: string) => void;
  type?: "number" | "text";
  placeholder?: string;
}

const keypadKeys = [
  ["separator", "all", "close"],
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["del", "0", "reset"],
];

const KeypadInput: React.FC<KeypadInputProps> = ({
  value = "",
  type = "text",
  onChange,
  placeholder,
}) => {
  const [keypadVisible, setKeypadVisible] = useState(false);

  const onKeypadDown = (type: string) => () => {
    if (onChange) {
      switch (type) {
         case "close": {
          setKeypadVisible(false)
          break;
        }
        case "separator": {
          if (
            value &&
            !value.includes("/") &&
            !value.toUpperCase().includes("ALL")
          )
            onChange(`${value}/`);
          break;
        }
        case "all": {
          if (
            value &&
            !value.includes("/") &&
            !value.toUpperCase().includes("ALL")
          )
            onChange(`${value}ALL`);
          break;
        }
        case "reset": {
          return onChange("");
        }
        case "del": {
          if (value.toUpperCase().includes("ALL"))
            return onChange(value.slice(0, value.length - 3));
          return onChange(value.slice(0, value.length - 1));
        }
        default: {
          if (value.toUpperCase().includes("ALL")) return;
          onChange(`${value}${type}`);
          break;
        }
      }
    }
  };

  return (
    <div className="custom-keypadinput">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly
        className={keypadVisible ? "active" : ""}
        onClick={() => setKeypadVisible(true)}
      />
      {keypadVisible && (
        <>
          <div
            className="custom-input-overlay"
            onClick={() => setKeypadVisible(false)}
          ></div>
          <div className="keypad">
            <table>
              <tbody>
                {keypadKeys.map((row, rowNum) => {
                  if (type === "number" && rowNum === 0) return null;
                  return (
                    <tr key={`${rowNum}`}>
                      {row.map((col, colNum) => {
                        if (!col) return <td key={`${colNum}`}></td>;

                        const disabled =
                          ((col === "all" || col === "separator") &&
                            (!value ||
                              value.includes("/") ||
                              value.toUpperCase().includes("ALL"))) ||
                          ((col === "del" || col === "reset") && !value);
                        return (
                          <td key={`${colNum}`}>
                            <img
                              src={`./images/keypad/${col}${disabled ? "-disabled" : ""}.png`}
                              onClick={() => !disabled && onKeypadDown(col)()}
                              draggable={false}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}                
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default KeypadInput;
