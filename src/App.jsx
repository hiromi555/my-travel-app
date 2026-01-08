import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import LZString from 'lz-string';

function App() {
  // 1. データ読み込み（ここはそのまま）
  const [plans, setPlans] = useState(() => {
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

  const [form, setForm] = useState({ date: "", time: "", title: "", cost: 0, memo: "", url: "" });
  const [showQR, setShowQR] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [isInputOpen, setIsInputOpen] = useState(false);

  // ★追加：管理メニューが開いているかどうか
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("travel_plans", JSON.stringify(plans));
  }, [plans]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = () => {
    if (form.title === "") return;

    if (editId) {
      setPlans(plans.map(plan =>
        plan.id === editId
          ? { ...plan, ...form, cost: Number(form.cost) }
          : plan
      ));
      setEditId(null);
      setForm({ date: "", time: "", title: "", cost: 0, memo: "", url: "" });
      setIsInputOpen(false);
    } else {
      const newPlan = { id: Date.now(), ...form, cost: Number(form.cost) };
      setPlans([...plans, newPlan]);

      setForm({
        date: form.date,
        time: "",
        title: "",
        cost: 0,
        memo: "",
        url: ""
      });
    }
  };

  const handleEdit = (plan) => {
    setEditId(plan.id);
    setForm(plan);
    setIsInputOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm({ date: "", time: "", title: "", cost: 0, memo: "", url: "" });
    setIsInputOpen(false);
  };

  const handleDelete = (id) => {
    if(window.confirm("削除しますか？")) {
       setPlans(plans.filter(plan => plan.id !== id));
       if (editId === id) handleCancelEdit();
    }
  };

  const handleClearAll = () => {
    if (window.confirm("本当に全てのデータを削除しますか？")) {
      setPlans([]);
      localStorage.removeItem("travel_plans");
      window.history.replaceState(null, "", window.location.pathname);
      setIsMenuOpen(false); // 削除したらメニューも閉じる
    }
  };

  const totalCost = plans.reduce((sum, plan) => sum + plan.cost, 0);

  const generateShareUrl = () => {
    const jsonString = JSON.stringify(plans);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    return `${window.location.origin}${window.location.pathname}?data=${compressed}`;
  };

  const groupedPlans = plans.reduce((acc, plan) => {
    const dateKey = plan.date || "undecided";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(plan);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedPlans).sort((a, b) => {
    if (a === "undecided") return 1;
    if (b === "undecided") return -1;
    return a.localeCompare(b);
  });

  const displayDates = activeTab === "ALL"
    ? sortedDates
    : sortedDates.filter(date => date === activeTab);

  const handleDownloadTxt = () => {
    let text = "✈️ 旅のしおり\n";
    text += "====================================\n";
    text += `💰 合計予算: ¥${totalCost.toLocaleString()}\n`;
    text += "====================================\n\n";

    sortedDates.forEach(date => {
      text += `■ ${date === "undecided" ? "日付未定" : date}\n`;
      text += "------------------------\n";

      const daysPlans = groupedPlans[date].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

      daysPlans.forEach(plan => {
        text += `${plan.time || "--:--"} | ${plan.title}`;
        if (plan.cost > 0) text += ` (¥${plan.cost.toLocaleString()})`;
        text += "\n";

        if (plan.memo) text += `   📝 ${plan.memo}\n`;
        if (plan.url) text += `   🔗 ${plan.url}\n`;
        text += "\n";
      });
      text += "\n";
    });

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "旅のしおり.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <h1>✈️ 旅のしおり</h1>

      <button
        className={`accordion-toggle ${isInputOpen ? "active" : ""}`}
        onClick={() => setIsInputOpen(!isInputOpen)}
      >
        {isInputOpen ? "🔼 入力フォームを閉じる" : "➕ 新しい予定を追加する"}
      </button>

      {isInputOpen && (
        <div className="input-area" style={editId ? { border: "2px solid #2196F3", background: "#e3f2fd" } : {}}>
          {editId && <div style={{color: "#2196F3", fontWeight: "bold", marginBottom: "10px"}}>✏️ 編集中...</div>}

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize:"0.8rem", color:"#666", display:"block", marginBottom:"4px" }}>日付</label>
            <input type="date" name="date" value={form.date} onChange={handleInputChange} style={{ width: "100%", padding: "10px", background: "#f9f9f9" }} />
          </div>

          <div className="input-row">
            <input type="time" name="time" value={form.time} onChange={handleInputChange} />
            <input type="text" name="title" placeholder="行き先・やること" className="flex-grow" value={form.title} onChange={handleInputChange} />
          </div>
          <div className="input-row">
            <input type="number" name="cost" placeholder="金額" value={form.cost || ""} onChange={handleInputChange} style={{ width: "80px" }} />
            <input type="text" name="memo" placeholder="メモ" className="flex-grow" value={form.memo} onChange={handleInputChange} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <input type="url" name="url" placeholder="参考URL (例: https://tabelog.com/...)" className="url-input" value={form.url || ""} onChange={handleInputChange} />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleSubmit} className="add-btn" style={editId ? { background: "#FF9800" } : {}}>
                {editId ? "更新する" : "プランに追加"}
              </button>
              {editId && (
                <button onClick={handleCancelEdit} style={{ background: "#999", color: "white", padding: "10px", borderRadius: "8px" }}>
                  キャンセル
                </button>
              )}
          </div>
        </div>
      )}

      {sortedDates.length > 0 && (
        <div className="tab-container">
          <button className={`tab-btn ${activeTab === "ALL" ? "active" : ""}`} onClick={() => setActiveTab("ALL")}>全て</button>
          {sortedDates.map(date => (
            <button key={date} className={`tab-btn ${activeTab === date ? "active" : ""}`} onClick={() => setActiveTab(date)}>
              {date === "undecided" ? "未定" : date.slice(5).replace("-", "/")}
            </button>
          ))}
        </div>
      )}

      <div>
        {displayDates.map((date) => {
          const dayTotal = groupedPlans[date].reduce((sum, p) => sum + p.cost, 0);

          return (
            <div key={date} className="date-section">
              <div className={`date-header ${date === "undecided" ? "undecided" : ""}`}>
                <span>{date === "undecided" ? "📅 日付未定" : `📅 ${date}`}</span>
                <span className="day-total">計 ¥{dayTotal.toLocaleString()}</span>
              </div>

              <ul className="plan-list">
                {groupedPlans[date]
                  .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
                  .map((plan) => (
                  <li key={plan.id} className="plan-item">
                    <div style={{ display: "flex", alignItems: "baseline", flex: 1 }}>
                      <span className="plan-time">{plan.time || "--:--"}</span>
                      <div>
                        <div className="plan-title">{plan.title}</div>
                        <div className="plan-memo">{plan.memo}</div>
                        {plan.url && (
                          <a href={plan.url} target="_blank" rel="noopener noreferrer" className="link-btn">
                            🔗 参考リンク
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: "80px" }}>
                      <div className="plan-cost">¥{plan.cost.toLocaleString()}</div>
                      <div style={{ marginTop: "5px" }}>
                        <button onClick={() => handleEdit(plan)} style={{ marginRight: "8px", color: "#2196F3", background: "none", border: "none", textDecoration: "underline", fontSize: "0.8rem" }}>
                          編集
                        </button>
                        <button onClick={() => handleDelete(plan.id)} className="delete-btn">
                          削除
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="footer-area">
        {/* 合計予算は常に表示！ */}
        <div className="budget-card">
          <span className="budget-label">TOTAL BUDGET</span>
          <span className="budget-value">¥{totalCost.toLocaleString()}</span>
        </div>

        {/* ★管理メニューのトグルボタン */}
        <button
          className="admin-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? "▼ 管理メニューを閉じる" : "⚙️ データの保存・転送・リセット"}
        </button>

        {/* ★ここから下が隠れるエリア */}
        {isMenuOpen && (
          <div className="admin-menu">
            <h4 style={{textAlign:"center", marginTop:0, color:"#666"}}>Data Management</h4>

            <button onClick={() => setShowQR(!showQR)} className="qr-btn" style={{marginBottom:"10px"}}>
              📱 スマホに送る (QR)
            </button>

            {showQR && (
              <div className="qr-box" style={{marginBottom:"20px"}}>
                <div style={{ background: "white", padding: "10px", borderRadius: "8px", display:"inline-block" }}>
                  <QRCodeCanvas value={generateShareUrl()} size={180} />
                </div>
              </div>
            )}

            <button
              onClick={handleDownloadTxt}
              style={{ display: "block", width:"100%", margin: "10px 0", padding:"10px", background:"white", border:"1px solid #ddd", borderRadius:"8px", color: "#006064" }}
            >
              📄 データをテキストで保存
            </button>

            <hr style={{margin:"20px 0", border:"none", borderTop:"1px solid #ddd"}}/>

            <button onClick={handleClearAll} className="reset-btn" style={{marginTop:0}}>
              🗑️ 全データを削除してリセット
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
