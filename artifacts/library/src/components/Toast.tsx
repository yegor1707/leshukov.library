import { useEffect, useState } from "react";

let toastCallback: ((msg: string) => void) | null = null;

export function showToast(msg: string) {
  if (toastCallback) toastCallback(msg);
}

export function ToastContainer() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    toastCallback = (newMsg: string) => {
      setMsg(newMsg);
      setShow(true);
      setTimeout(() => setShow(false), 2400);
    };
    return () => { toastCallback = null; };
  }, []);

  return (
    <div className={`toast ${show ? "show" : ""}`}>
      {msg}
    </div>
  );
}
