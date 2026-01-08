import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // QRコード描画用
import LZString from 'lz-string'; // 圧縮用

function App() {
  // ----------------------------------------------------
  // 1. 初期化 & インポート機能（ここがスマホ側の処理！）
  // ----------------------------------------------------
  const [plans, setPlans] = useState(() => {
    // A. URLにデータがあるかチェック（スマホでQRを読み取った場合）
    const searchParams = new URLSearchParams(window.location.search);
    const sharedData = searchParams.get("data");

    if (sharedData) {
      try {
        // 圧縮されたデータを解凍する
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedData);
        const parsed = JSON.parse(decompressed);
        // 読み込み成功したら、それを初期データにする
        // ついでにURLを綺麗にする（?data=... を消す）
        window.history.replaceState(null, "", window.location.pathname);
        return parsed;
      } catch (e) {
        console.error("データの読み込みに失敗しました", e);
      }
    }

    // B. なければいつものLocalStorageから読み込み
    const saved = localStorage.getItem("travel_plans");
    return saved ? JSON.parse(saved) : [];
  });

  // その他のState
  const [form, setForm] = useState({ time: "", title: "", cost: 0, memo: "" });
  const [showQR, setShowQR] = useState(false); // QRコードを表示するかどうかのスイッチ

  // 2. 自動保存
  useEffect(() => {
    localStorage.setItem("travel_plans", JSON.stringify(plans));
  }, [plans]);

  // 入力ハンドラ
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // 追加ハンドラ
  const handleAdd = () => {
    if (form.title === "") return;
    const newPlan = { id: Date.now(), ...form, cost: Number(form.cost) };
    setPlans([...plans, newPlan]);
    setForm({ time: "", title: "", cost: 0, memo: "" });
  };

  // 削除ハンドラ
  const handleDelete = (id) => {
    setPlans(plans.filter(plan => plan.id !== id));
  };

  // 合計金額
  const totalCost = plans.reduce((sum, plan) => sum + plan.cost, 0);

  // ----------------------------------------------------
  // 3. エクスポート機能（ここがPC側の処理！）
  // ----------------------------------------------------
  // 共有用URLを生成する関数
  const generateShareUrl = () => {
    // データを文字列にして圧縮
    const jsonString = JSON.stringify(plans);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);

    // 現在のURL（例: https://my-app.vercel.app/）の後ろにデータをくっつける
    const url = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
    return url;
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>✈️ 旅のしおり</h1>

      {/* 合計金額エリア */}
      <div style={{ background: "#e0f7fa", padding: "15px", borderRadius: "8px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>💰 合計予算</span>
        <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#006064" }}>
          ¥{totalCost.toLocaleString()}
        </span>
      </div>

      {/* 入力エリア */}
      <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "8px", marginBottom: "20px", background: "#fafafa" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input type="time" name="time" value={form.time} onChange={handleInputChange} style={{padding:"8px"}} />
          <input type="text" name="title" placeholder="行き先・やること" value={form.title} onChange={handleInputChange} style={{ flex: 1, padding:"8px" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input type="number" name="cost" placeholder="金額" value={form.cost} onChange={handleInputChange} style={{padding:"8px", width: "80px"}} />
          <input type="text" name="memo" placeholder="メモ" value={form.memo} onChange={handleInputChange} style={{ flex: 1, padding:"8px" }} />
        </div>
        <button onClick={handleAdd} style={{ width: "100%", padding: "10px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          追加する
        </button>
      </div>

      {/* リスト表示 */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {plans.map((plan) => (
          <li key={plan.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0", display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{plan.time} {plan.title}</strong>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>{plan.memo}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#E91E63", fontWeight: "bold" }}>¥{plan.cost.toLocaleString()}</div>
              <button onClick={() => handleDelete(plan.id)} style={{ color: "red", border: "none", background: "none", cursor: "pointer", fontSize: "0.8rem" }}>削除</button>
            </div>
          </li>
        ))}
      </ul>

      <hr style={{ margin: "30px 0" }} />

      {/* ---------------------------------------------------- */}
      {/* 4. スマホへ送る（QRコード表示）エリア */}
      {/* ---------------------------------------------------- */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => setShowQR(!showQR)}
          style={{ background: "#673AB7", color: "white", padding: "10px 20px", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "1rem" }}
        >
          📱 スマホに送る
        </button>

        {showQR && (
          <div style={{ marginTop: "20px", padding: "20px", border: "2px dashed #673AB7", borderRadius: "10px", background: "#f3e5f5" }}>
            <p style={{ fontSize: "0.9rem", color: "#673AB7", marginBottom: "15px" }}>
              スマホのカメラで読み取ると、<br/>データがコピーされます！
            </p>
            <div style={{ background: "white", padding: "10px", display: "inline-block" }}>
              <QRCodeCanvas
                value={generateShareUrl()}
                size={200}
                level={"M"} // QRのエラー訂正レベル
              />
            </div>
            <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "10px" }}>
              ※ アプリをWeb上に公開していないと<br/>スマホでは開けません
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
