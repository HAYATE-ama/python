/**
 * フォーム送信処理（input_source 連携版）
 */
function submitClimbingForm(event) {
    event.preventDefault();

    const form = document.getElementById("climbingForm");
    const hiddenGrade = document.getElementById("grade");
    const toggle = document.getElementById("gradeSystemToggle");

    if (hiddenGrade && toggle) {
        const activeSelect = toggle.checked ? document.getElementById("gradeV") : document.getElementById("gradeJp");
        if (activeSelect && activeSelect.value) {
            hiddenGrade.value = activeSelect.value;
        }
    }

    if (!hiddenGrade || !hiddenGrade.value) {
        alert("グレードを正しく選択してください。");
        return;
    }

    const GAS_WEB_APP_URL = form.getAttribute("data-url");
    const successMessage = form.getAttribute("data-msg") || "データを登録しました！";

    if (!GAS_WEB_APP_URL) {
        alert("システムエラー: 送信先URLが設定されていません。");
        return;
    }

    const messageDiv = document.getElementById("message");
    if (messageDiv) {
        messageDiv.textContent = "データを送信中...";
        messageDiv.className = "";
    }

    const formData = new FormData(form);
    const params = new URLSearchParams();

    const currentUrl = window.location.pathname;
    const isGymPage = currentUrl.includes("P001");
    params.append("input_source", isGymPage ? "P001" : "P002");

    formData.forEach((value, key) => {
        if (key !== "input_source") {
            params.append(key, value);
        }
    });

    params.set("grade", hiddenGrade.value);

    fetch(GAS_WEB_APP_URL, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    })
        .then(() => {
            if (messageDiv) {
                document.getElementById("message").textContent = successMessage;
                document.getElementById("message").className = "success";
            }
            form.reset();
            if (hiddenGrade) hiddenGrade.value = "";

            if (toggle) {
                toggle.checked = false;
                switchGradeSystem();
            }
        })
        .catch(error => {
            console.error("Error:", error);
            if (messageDiv) {
                messageDiv.textContent = "エラーが発生しました。時間をおいて再度お試しください。";
                messageDiv.className = "error";
            }
        });
}





/**
 * GASのWebAPIへ編集データをPOST送信する（安全なシリアライズ順序へ修正）
 */
function executeDataUpdate(event) {
    event.preventDefault();

    const gasUrl = document.getElementById("gasEndpoint").value;
    const msgDiv = document.getElementById("editMessage");
    const submitBtn = document.getElementById("editSubmitBtn");
    const modal = document.getElementById("editModal");

    // 先にFormDataを生成して、すべてのinput(hidden含む)の値を確実にキャッチする
    const form = document.getElementById("editForm");
    const formData = new FormData(form);
    const params = new URLSearchParams();

    // 確実にデータが吸い上がった後にボタンを非活性化
    msgDiv.textContent = "更新中...";
    msgDiv.style.color = "var(--primary, #0ea5e9)";
    submitBtn.disabled = true;

    // POST用にデータを成形
    formData.forEach((value, key) => {
        params.append(key, value);
    });

    // メソッド特定用のカスタムパラメータ（GAS側のdoPost内の分岐スイッチ用）
    params.append("action", "update");

    fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    })
        .then(() => {
            msgDiv.textContent = "更新が成功しました！";
            msgDiv.style.color = "var(--success, #10b981)";

            // ローカルキャッシュ(window.cachedClimbingData)の書き換え
            const updatedNo = document.getElementById("editNo").value;
            const targetIndex = window.cachedClimbingData.findIndex(item => String(item.no) === String(updatedNo));

            if (targetIndex !== -1) {
                // 入力フォームから日付を取得し、表示用フォーマット("2026-05-26" -> "2026/05/26")へ再変換
                const rawDate = document.getElementById("editDate").value;
                window.cachedClimbingData[targetIndex].date = rawDate ? rawDate.replace(/-/g, "/") : "-";
                window.cachedClimbingData[targetIndex].location = document.getElementById("editLocation").value;
                window.cachedClimbingData[targetIndex].wall = document.getElementById("editWall").value;
                window.cachedClimbingData[targetIndex].grade = document.getElementById("editGrade").value;
                window.cachedClimbingData[targetIndex].style = document.getElementById("editStyle").value;
                window.cachedClimbingData[targetIndex].result = document.getElementById("editResult").value;
                window.cachedClimbingData[targetIndex].memo = document.getElementById("editMemo").value;
            }

            // 1秒後にモーダルを閉じ、タイムラインを最新キャッシュに基づき再描画
            setTimeout(() => {
                if (modal) modal.classList.add("hidden");
                document.body.classList.remove("modal-open");

                const timelineContainer = document.getElementById("timelineContainer");
                if (timelineContainer) {
                    // 現在アクティブなタブの状態を引き継いで再描写
                    const activeTab = document.querySelector(".tab-btn[style*='var(--primary)']");
                    const currentType = activeTab ? activeTab.id.replace("tab-", "") : "all";
                    filterTimeline(currentType);
                }
            }, 1000);
        })
        .catch(error => {
            console.error("Update Error:", error);
            msgDiv.textContent = "通信エラーが発生しました。";
            msgDiv.style.color = "var(--error, #ef4444)";
            submitBtn.disabled = false;
        });
}








// =========================================================================
// 共通メソッド
// =========================================================================
// ルーティングオブジェクト
window.RouteSelector = {
    moveTo: function (pageCode) {
        if (!pageCode) return;
        window.location.href = '../xhtml/' + pageCode + '.xhtml';
    }
};

/**
 * 現在地のナビゲーションボタンに active クラスを付与する関数
 */
function updateActiveNav() {
    const path = window.location.pathname;
    const navMap = [
        { id: 'nav-P001', key: 'P001' },
        { id: 'nav-P002', key: 'P002' },
        { id: 'nav-P003', key: 'P003' },
        { id: 'nav-P004', key: 'P004' },
        { id: 'nav-P005', key: 'P005' }
    ];

    navMap.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            if (path.includes(item.key)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

// 1. 画面読み込み時の初期化処理（すべての画面のイベントを一元管理）
window.cachedClimbingData = [];

document.addEventListener("DOMContentLoaded", function () {
    // --- 1.2 ナビゲーションのactiveクラス付与（挿入後に実行） ---
    updateActiveNav();

    // ─── フォーム画面用（P001 / P002）の初期化 ───
    const form = document.getElementById("climbingForm");
    if (form) {
        form.addEventListener("submit", submitClimbingForm);
    }

    // デートピッカー強制展開処理
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(function (input) {
        input.addEventListener('click', function () {
            if (typeof this.showPicker === 'function') {
                this.showPicker();
            }
        });
    });

    // ─── 履歴画面 (P003) ───
    if (document.getElementById("timelineContainer")) {
        initP003();
    }

    // --- 5. プロフィール画面 (P005) 初期化 ---
    if (window.location.pathname.includes('P005')) {
        initP005();
    }

    // ★P004用：フォーム送信イベントの登録

    const btnStart = document.getElementById('btnStartTraining');
    const formContainer = document.getElementById('trainingFormContainer');
    const startContainer = document.getElementById('startTrainingContainer');

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            // ボタンエリアを非表示
            if (startContainer) startContainer.classList.add('hidden');
            // フォームエリアを表示
            if (formContainer) formContainer.classList.remove('hidden');
        });
    }
    // AIアドバイスの取得をページ読み込み時に開始
    if (document.getElementById('overallAdvice')) {
        fetchTrainingAdvice();
    }
});

// 3. フォーム画面（P001 / P002）専用：登録・トグル制御ロジック

/**
 * 日本グレードとVグレードの表示システムを切り替える
 */
function switchGradeSystem() {
    const toggle = document.getElementById("gradeSystemToggle");
    const gradeJp = document.getElementById("gradeJp");
    const gradeV = document.getElementById("gradeV");
    const labelJp = document.getElementById("toggle-label-jp");
    const labelV = document.getElementById("toggle-label-v");
    const hiddenGrade = document.getElementById("grade");

    if (!toggle || !gradeJp || !gradeV || !labelJp || !labelV) return;

    if (toggle.checked) {
        gradeJp.classList.add("hidden");
        gradeJp.removeAttribute("required");
        gradeJp.value = "";
        gradeV.classList.remove("hidden");
        gradeV.setAttribute("required", "required");
        labelJp.classList.remove("active");
        labelV.classList.add("active");
    } else {
        gradeV.classList.add("hidden");
        gradeV.removeAttribute("required");
        gradeV.value = "";
        gradeJp.classList.remove("hidden");
        gradeJp.setAttribute("required", "required");
        labelV.classList.remove("active");
        labelJp.classList.add("active");
    }

    if (hiddenGrade) {
        hiddenGrade.value = "";
    }
}

function syncGradeValue(selectElement) {
    const hiddenGrade = document.getElementById("grade");
    if (hiddenGrade && selectElement) {
        hiddenGrade.value = selectElement.value;
    }
}
// =========================================================================
// P000.xhtml専用メソッド
// =========================================================================

// =========================================================================
// P001.xhtml専用メソッド
// =========================================================================

// =========================================================================
// P002.xhtml専用メソッド
// =========================================================================

// =========================================================================
// P003.xhtml専用メソッド
// =========================================================================

/**
 * 履歴画面 (P003) の初期化処理
 */
function initP003() {
    const timelineContainer = document.getElementById("timelineContainer");
    const gasEndpointInput = document.getElementById("gasEndpoint");
    const statusMessage = document.getElementById("historyStatus");

    if (!timelineContainer) return;

    if (!gasEndpointInput || !gasEndpointInput.value) {
        showHistoryError("システムエラー: 接続先URLが見つかりません。");
        return;
    }

    fetch(gasEndpointInput.value)
        .then(response => {
            if (!response.ok) throw new Error("ネットワーク応答エラー");
            return response.json();
        })
        .then(res => {
            if (res.status === "success" && Array.isArray(res.data)) {
                if (statusMessage) statusMessage.classList.add("hidden");
                window.cachedClimbingData = res.data;
                renderCardTimeline(window.cachedClimbingData, timelineContainer);
                timelineContainer.classList.remove("hidden");
            } else {
                throw new Error(res.message || "データ取得失敗");
            }
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            showHistoryError("履歴データの読み込みに失敗しました。");
        });

    function showHistoryError(message) {
        if (statusMessage) {
            statusMessage.innerHTML = `<i class="fa-solid fa-triangle-exclamation fa-2x" style="color:var(--error);"></i><div>${message}</div>`;
        }
    }
}

/**
 * 修正版：すべての履歴を一行リスト形式で描画するロジック
 */
function renderCardTimeline(dataList, targetContainer) {
    targetContainer.innerHTML = "";

    if (dataList.length === 0) {
        targetContainer.innerHTML = '<div class="status-message"><i class="fa-solid fa-folder-open fa-2x"></i><div>対象のデータがありません。</div></div>';
        return;
    }

    let htmlBuffer = "";
    let currentGroupDate = "";

    dataList.forEach(item => {
        const targetDate = item.date || "日付なし";

        // 日付セッションブロックの判定
        if (targetDate !== currentGroupDate) {
            if (currentGroupDate !== "") htmlBuffer += '</div>';
            currentGroupDate = targetDate;
            htmlBuffer += `<div class="session-block">`;
            htmlBuffer += `  <span class="session-date-header"><i class="fa-regular fa-calendar-check"></i>${currentGroupDate}</span>`;
        }

        // --- 全項目を共通の一行リストデザインで統一 ---
        const cleanLocation = String(item.location || "").replace(/_/g, " ");
        const resultLabel = item.result || "-";

        htmlBuffer += `
            <div class="climb-list-item" onclick="openEditModal('${item.no}')" 
                 style="display: flex; justify-content: space-between; align-items: center; padding: 12px 10px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s;">
                
                <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">${cleanLocation}</span>
                    <strong style="color: var(--text); font-size: 0.9rem;">${item.wall || "-"}</strong>
                </div>

                <div style="flex: 0 0 auto; text-align: right;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${resultLabel}</span>
                    <strong style="color: var(--primary); font-size: 1rem;">${item.grade || "-"}</strong>
                </div>
            </div>`;
    });

    if (currentGroupDate !== "") {
        htmlBuffer += '</div>';
    }

    targetContainer.innerHTML = htmlBuffer;
}

/**
 * 補助関数：バッジクラスを判定する（コード重複削減のため切り出し）
 */
function getBadgeClass(result) {
    const res = (result || "").toLowerCase();
    if (res.includes("flash") || res.includes("フラッシュ")) return "badge-flash";
    if (res.includes("redpoint") || res.includes("rp") || res.includes("完登")) return "badge-rp";
    if (res.includes("attempt") || res.includes("トライ") || res.includes("投")) return "badge-atm";
    return "badge-default";
}

/**
 * タブ切り替え時にデータを「input_source」ベースでフィルタリングして再描画する
 */
function filterTimeline(type) {
    const container = document.getElementById("timelineContainer");
    if (!container || !window.cachedClimbingData) return;

    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
        tab.style.border = "1px solid var(--border)";
        tab.style.color = "var(--text-muted)";
    });

    const activeTab = document.getElementById(`tab-${type}`);
    if (activeTab) {
        activeTab.style.border = "1px solid var(--primary)";
        activeTab.style.color = "var(--primary)";
    }

    let filteredData = [];
    if (type === "all") {
        filteredData = window.cachedClimbingData;
    } else {
        filteredData = window.cachedClimbingData.filter(item => {
            const sourceFlag = String(
                item.input_source !== undefined ? item.input_source : Object.values(item)[0]
            ).trim();

            if (type === "gym") {
                return sourceFlag === "P001";
            } else if (type === "rock") {
                return sourceFlag === "P002";
            }
            return true;
        });
    }

    renderCardTimeline(filteredData, container);
}

/**
 * モーダル専用のグレード切り替え制御
 */
function switchModalGradeSystem() {
    const toggle = document.getElementById("modalGradeSystemToggle");
    const gradeJp = document.getElementById("editGradeJp");
    const gradeV = document.getElementById("editGradeV");
    const labelJp = document.getElementById("modal-toggle-label-jp");
    const labelV = document.getElementById("modal-toggle-label-v");

    if (!toggle || !gradeJp || !gradeV || !labelJp || !labelV) return;

    if (toggle.checked) {
        gradeJp.classList.add("hidden");
        gradeJp.removeAttribute("required");
        gradeV.classList.remove("hidden");
        gradeV.setAttribute("required", "required");
        labelJp.classList.remove("active");
        labelV.classList.add("active");
    } else {
        gradeV.classList.add("hidden");
        gradeV.removeAttribute("required");
        gradeJp.classList.remove("hidden");
        gradeJp.setAttribute("required", "required");
        labelV.classList.remove("active");
        labelJp.classList.add("active");
    }
}

function syncModalGradeValue(selectElement) {
    const hiddenGrade = document.getElementById("editGrade");
    if (hiddenGrade && selectElement) {
        hiddenGrade.value = selectElement.value;
    }
}

/**
 * タイムラインカードクリック時：対象データをモーダルフォームへ展開して表示
 */
function openEditModal(no) {
    if (!window.cachedClimbingData) return;

    const targetItem = window.cachedClimbingData.find(item => String(item.no) === String(no));
    if (!targetItem) return;

    // フォームへの値マッピング
    document.getElementById("editNo").value = targetItem.no;
    document.getElementById("editNoTxt").textContent = targetItem.no;
    document.getElementById("editSource").value = targetItem.input_source;

    // 日付フォーマット変換 ("2026/05/26" -> "2026-05-26")
    if (targetItem.date && targetItem.date !== "-") {
        document.getElementById("editDate").value = targetItem.date.replace(/\//g, "-");
    } else {
        document.getElementById("editDate").value = "";
    }

    document.getElementById("editLocation").value = targetItem.location || "";
    document.getElementById("editWall").value = targetItem.wall || "";
    document.getElementById("editStyle").value = targetItem.style || "";
    document.getElementById("editResult").value = targetItem.result || "";
    document.getElementById("editMemo").value = targetItem.memo || "";

    // グレードの初期マッピングとトグルの自動連動判定
    const currentGrade = targetItem.grade || "";
    document.getElementById("editGrade").value = currentGrade;

    const modalToggle = document.getElementById("modalGradeSystemToggle");
    if (modalToggle) {
        if (currentGrade.startsWith("V")) {
            modalToggle.checked = true;
            document.getElementById("editGradeV").value = currentGrade;
            document.getElementById("editGradeJp").value = "";
        } else {
            modalToggle.checked = false;
            document.getElementById("editGradeJp").value = currentGrade;
            document.getElementById("editGradeV").value = "";
        }
        switchModalGradeSystem();
    }

    // 画面ソース（ジム P001 / 外岩 P002）により文言の動的クリーンアップ
    const isGym = targetItem.input_source === "P001";
    document.getElementById("editLocationLabel").textContent = isGym ? "店舗名" : "岩場名・地域";
    document.getElementById("editWallLabel").textContent = isGym ? "壁名・テープ" : "課題名";

    // メッセージ初期化、ボタン活性化
    document.getElementById("editMessage").textContent = "";
    document.getElementById("editMessage").style.color = "initial";
    document.getElementById("editSubmitBtn").disabled = false;

    // モーダルの可視化
    const modal = document.getElementById("editModal");
    if (modal) modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
}
/**
 * モーダル専用初期イベント定義
 */
document.addEventListener("DOMContentLoaded", function () {
    const closeModalBtn = document.getElementById("closeModalBtn");
    const modal = document.getElementById("editModal");
    const editForm = document.getElementById("editForm");

    if (closeModalBtn && modal) {
        // 閉じる処理の共通化
        const closeModal = function () {
            modal.classList.add("hidden");
            document.body.classList.remove("modal-open");
        };

        closeModalBtn.addEventListener("click", closeModal);

        // 背景の黒い部分をクリック時
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    if (editForm) {
        editForm.addEventListener("submit", executeDataUpdate);
    }
});
// =========================================================================
// P004.xhtml専用メソッド
// =========================================================================
// 2. 画面に反映させる関数
function renderMenu(data) {
    // 1. 各要素を取得
    const adviceDiv = document.getElementById('overallAdvice');
    const climbList = document.getElementById('climbingMenu');
    const physList = document.getElementById('physicalMenu');

    // 2. 要素がある場合のみ処理を実行
    if (adviceDiv) {
        adviceDiv.textContent = data.overallAdvice;
    }

    if (climbList && data.climbingMenu) {
        climbList.innerHTML = ""; // クリア
        data.climbingMenu.forEach(item => {
            climbList.appendChild(createCheckbox(item, 'climbingTasks'));
        });
    }

    if (physList && data.physicalMenu) {
        physList.innerHTML = ""; // クリア
        data.physicalMenu.forEach(item => {
            physList.appendChild(createCheckbox(item, 'physicalTasks'));
        });
    }
}

// チェックボックスを生成する補助関数
function createCheckbox(text, name) {
    const label = document.createElement('label');
    label.className = 'menu-item';
    label.innerHTML = `
        <input type="checkbox" name="${name}" value="${text}" />
        <div class="menu-text">
            <span class="title">${text}</span>
        </div>
    `;
    return label;
}

// document.addEventListener('DOMContentLoaded', () => {
//     if (document.getElementById('overallAdvice')) {
//         fetchTrainingAdvice();
//     }
// });

/**
 * P004 トレーニングメニュー完了送信ロジック
 */
function submitTrainingForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // チェックボックスの値をカンマ区切りの文字列に変換
    const climbingTasks = formData.getAll('climbingTasks').join(', ');
    const physicalTasks = formData.getAll('physicalTasks').join(', ');

    const params = new URLSearchParams();
    params.append("input_source", "P004"); // P004からの送信であることを明記
    params.append("overallAdvice", document.getElementById('overallAdvice').textContent);
    params.append("climbingTasks", climbingTasks);
    params.append("physicalTasks", physicalTasks);
    params.append("memo", formData.get('memo'));

    // P004のフォームからGASのURLを取得（P004.xhtmlに data-url 属性を忘れずに！）
    const gasUrl = form.getAttribute("data-url");

    const messageDiv = document.getElementById("message");
    if (messageDiv) {
        messageDiv.textContent = "データを送信中...";
        messageDiv.className = ""; // クラスをリセット
    }

    fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    })
        .then(res => res.json())
        .then(data => {
            if (messageDiv) {
                // ここで他の画面と同じクラス名 "success" を付与
                messageDiv.textContent = "トレーニングを記録しました！";
                messageDiv.className = "success";
            }
            form.reset();
        })
        .catch(error => {
            console.error("Error:", error);
            if (messageDiv) {
                // エラー時は "error" クラスを付与
                messageDiv.textContent = "保存に失敗しました。";
                messageDiv.className = "error";
            }
        });
}

function fetchTrainingAdvice() {
    const adviceDiv = document.getElementById('overallAdvice');
    adviceDiv.textContent = "AIがあなたの登りを解析中...";

    const gasUrl = document.getElementById('trainingMenuForm').getAttribute('data-url');

    fetch(gasUrl + "?action=getAdvice")
        .then(response => response.text()) // ここでテキスト化
        .then(text => {
            console.log("GASからの生レスポンス:", text);

            try {
                // 文字列の中にJSON以外の余計なもの（改行など）が含まれている場合を考慮
                const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
                const data = JSON.parse(jsonStr);
                renderMenu(data);
            } catch (e) {
                console.error("JSONパース失敗:", e);
                // パース失敗時、画面に原因を表示
                adviceDiv.textContent = "解析データ形式エラー";
            }
        })
        .catch(err => {
            console.error("通信エラー詳細:", err);
            adviceDiv.textContent = "取得エラー: 通信に失敗しました";
        });
}
// =========================================================================
// P005.xhtml専用メソッド
// =========================================================================
// P005用の初期化関数
function initP005() {
    const form = document.getElementById("profileForm");
    if (!form) return;

    // イベントリスナーを重複させないために一度removeする（念のため）
    form.removeEventListener("submit", handleProfileSubmit);
    form.addEventListener("submit", handleProfileSubmit);

    // 1. データ読み込み
    initProfile();
}

// 独立した関数として定義する
function handleProfileSubmit(e) {
    e.preventDefault();
    saveProfile();
}
// 読み込み実行（エラーハンドリングを追加）
function initProfile() {
    const form = document.getElementById("profileForm");
    const endpoint = form.getAttribute("data-url");

    if (!endpoint) {
        console.error("Endpoint URLが設定されていません");
        return;
    }

    fetch(endpoint + "?type=profile")
        .then(res => {
            if (!res.ok) throw new Error("サーバー応答エラー");
            return res.json();
        })
        .then(res => {
            if (res.status === "success" && res.data) {
                const d = res.data;
                // 各入力項目へ値をセット
                ['height', 'weight', 'reach', 'weakness'].forEach(f => {
                    const el = form.querySelector(`[name="${f}"]`);
                    if (el) el.value = d[f] || "";
                });

                const homeTrain = document.getElementById("homeTrain");
                if (homeTrain) homeTrain.checked = (d.homeTrain === "あり");

                // 曜日ボタンの活性状態復元
                if (d.gymDays) {
                    const activeDays = d.gymDays.split(',');
                    document.querySelectorAll('.day-btn').forEach(btn => {
                        if (activeDays.includes(btn.textContent)) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                }
            }
        })
        .catch(err => {
            console.error("プロフィール読み込みエラー:", err);
            // ユーザーにアラートを出すか、UIにエラーを表示する処理
        });
}

function saveProfile() {
    const form = document.getElementById("profileForm");
    const messageDiv = document.getElementById("message");

    if (messageDiv) {
        messageDiv.textContent = "保存中...";
        messageDiv.className = ""; // クラスをリセット
    }

    const selectedDays = Array.from(document.querySelectorAll('.day-btn.active'))
        .map(btn => btn.textContent).join(',');
    document.getElementById("gymDays").value = selectedDays;

    // const homeTrainEl = document.getElementById("homeTrain");
    // const homeTrainVal = homeTrainEl.checked ? "あり" : "なし";

    const params = new URLSearchParams(new FormData(form));
    params.set("input_source", "P005");

    fetch(form.getAttribute("data-url"), {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    })
        .then(res => {
            // 1. HTTPステータスが200-299以外ならエラー
            if (!res.ok) throw new Error("サーバーレスポンスエラー: " + res.status);
            return res.json(); // 2. JSONとしてパース
        })
        .then(data => {
            if (data && data.status === 'success') {
                if (messageDiv) {
                    messageDiv.textContent = "プロフィールを更新しました！";
                    messageDiv.className = "success"; // CSSで定義済みのスタイルを適用
                }
            } else {
                throw new Error("更新失敗");
            }
        })
        .catch(err => {
            console.error(err);
            if (messageDiv) {
                messageDiv.textContent = "保存に失敗しました。";
                messageDiv.className = "error";
            }
        });
}