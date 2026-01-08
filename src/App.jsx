import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import LZString from 'lz-string';
//import './App.css';

function App() {

  const [plans, setPlans] = useState(() => {
     // (省略: 以前のコードと同じ)
     // URLチェックとlocalStorage読み込みのロジック
     const searchParams = new URLSearchParams(window.location.search);
     const sharedData = searchParams.get("data");
     if (sharedData) {
       try {
         const decompressed = LZString.decompressFromEncodedURIComponent(sharedData);
         const parsed = JSON.parse(decompressed);
         window.history.replaceState(null, "", window.location.pathname);
         return parsed;
       } catch (e) { console.error(e); }
     }
     const saved = localStorage.getItem("travel_plans");
     return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({ time: "", title: "", cost: 0, memo: "" });
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    localStorage.setItem("travel_plans", JSON.stringify(plans));
  }, [plans]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleAdd = () => {
    if (form.title === "") return;
    const newPlan = { id: Date.now(), ...form, cost: Number(form.cost) };
    setPlans([...plans, newPlan]);
    setForm({ time: "", title: "", cost: 0, memo: "" });
  };

  const handleDelete = (id) => {
    setPlans(plans.filter(plan => plan.id !== id));
  };

  // ★追加：全削除ボタンの機能
  const handleClearAll = () => {
    if (window.confirm("本当に全てのデータを削除しますか？\nこの操作は取り消せません。")) {
      setPlans([]);
      localStorage.removeItem("travel_plans");
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const totalCost = plans.reduce((sum, plan) => sum + plan.cost, 0);

  const generateShareUrl = () => {
    const jsonString = JSON.stringify(plans);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    return `${window.location.origin}${window.location.pathname}?data=${compressed}`;
  };

  // -----------------------------------------------------------
  // 見た目（JSX）の書き換え
  // -----------------------------------------------------------
  return (
    <div className="container">
      <h1>✈️ 旅のしおり</h1>

      {/* 合計金額カード */}
      <div className="budget-card">
        <span className="budget-label">TOTAL BUDGET</span>
        <span className="budget-value">¥{totalCost.toLocaleString()}</span>
      </div>

      {/* 入力フォーム */}
      <div className="input-area">
        <div className="input-row">
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleInputChange}
          />
          <input
            type="text"
            name="title"
            placeholder="行き先・やること"
            className="flex-grow"
            value={form.title}
            onChange={handleInputChange}
          />
        </div>
        <div className="input-row">
          <input
            type="number"
            name="cost"
            placeholder="金額"
            value={form.cost || ""}
            onChange={handleInputChange}
            style={{ width: "80px" }}
          />
          <input
            type="text"
            name="memo"
            placeholder="メモ（予約番号、URLなど）"
            className="flex-grow"
            value={form.memo}
            onChange={handleInputChange}
          />
        </div>
        <button onClick={handleAdd} className="add-btn">
          プランに追加
        </button>
      </div>

      {/* リスト表示 */}
      <ul className="plan-list">
        {plans.map((plan) => (
          <li key={plan.id} className="plan-item">
            <div style={{ display: "flex", alignItems: "baseline", flex: 1 }}>
              <span className="plan-time">{plan.time || "--:--"}</span>
              <div>
                <div className="plan-title">{plan.title}</div>
                <div className="plan-memo">{plan.memo}</div>
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: "80px" }}>
              <div className="plan-cost">¥{plan.cost.toLocaleString()}</div>
              <button onClick={() => handleDelete(plan.id)} className="delete-btn">
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* フッターエリア */}
      <div className="footer-area">
        <button onClick={() => setShowQR(!showQR)} className="qr-btn">
          📱 スマホに送る
        </button>

        {showQR && (
          <div className="qr-box">
            <p style={{ marginBottom: "15px", color: "#673AB7" }}>
              カメラで読み取るとデータが移行されます
            </p>
            <div style={{ background: "white", padding: "10px", borderRadius: "8px", display:"inline-block" }}>
              <QRCodeCanvas
                value={generateShareUrl()}
                size={180}
              />
            </div>
          </div>
        )}

        {/* ★ここが全データ削除ボタン */}
        <button onClick={handleClearAll} className="reset-btn">
          🗑️ 全データを削除してリセット
        </button>
      </div>
    </div>
  );
}

export default App;
