/**
 * クライミング管理システム - 共通コアスクリプト（input_source対応・画面コード文字列版）
 */

// ルーティングオブジェクト
window.RouteSelector = {
    moveTo: function (pageCode) {
        if (!pageCode) return;
        window.location.href = './' + pageCode + '.xhtml';
    }
};

// =========================================================================
// 1. 画面読み込み時の初期化処理（すべての画面のイベントを一元管理）
// =========================================================================
window.cachedClimbingData = [];

document.addEventListener("DOMContentLoaded", function () {

    // ─── フォーム画面用（P001 / P002）の初期化 ───
    const form = document.getElementById("climbingForm");
    if (form) {
        form.addEventListener("submit", submitClimbingForm);
    }

    // デートピッカー制御（枠内のどこをクリックしてもカレンダーを強制展開）
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(function (input) {
        input.addEventListener('click', function () {
            if (typeof this.showPicker === 'function') {
                this.showPicker();
            }
        });
    });

    // ─── 履歴画面用（P003）の初期化とデータロード処理 ───
    const timelineContainer = document.getElementById("timelineContainer");
    if (timelineContainer) {
        const gasEndpointInput = document.getElementById("gasEndpoint");
        const statusMessage = document.getElementById("historyStatus");

        if (!gasEndpointInput || !gasEndpointInput.value) {
            showError("システムエラー: 接続先URLが見つかりません。");
            return;
        }

        // GASから一元化データを取得（GETリクエスト）
        fetch(gasEndpointInput.value)
            .then(response => {
                if (!response.ok) throw new Error("ネットワーク応答が正常ではありません。");
                return response.json();
            })
            .then(res => {
                if (res.status === "success" && Array.isArray(res.data)) {
                    if (statusMessage) statusMessage.classList.add("hidden");
                    
                    window.cachedClimbingData = res.data;
                    
                    // 初期表示は「すべて」を表示
                    renderCardTimeline(window.cachedClimbingData, timelineContainer);
                    timelineContainer.classList.remove("hidden");
                } else {
                    throw new Error(res.message || "データの取得に失敗しました。");
                }
            })
            .catch(error => {
                console.error("Fetch Error:", error);
                showError("履歴データの読み込みに失敗しました。ローカルサーバー(Live Server等)で実行しているか確認してください。");
            });

        function showError(message) {
            if (statusMessage) {
                statusMessage.innerHTML = `<i class="fa-solid fa-triangle-exclamation fa-2x" style="color:var(--error);"></i><div>${message}</div>`;
            }
        }
    }
});

// =========================================================================
// 2. 履歴画面（P003）専用：カード型タイムライン描画 & フィルタロジック
// =========================================================================

/**
 * 取得した一元化データ配列から日付ごとにグルーピングしたカード型タイムラインを生成する
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

        // 新しい日付セッションブロックの判定と追加
        if (targetDate !== currentGroupDate) {
            if (currentGroupDate !== "") {
                htmlBuffer += '</div>';
            }
            currentGroupDate = targetDate;
            htmlBuffer += `<div class="session-block">`;
            htmlBuffer += `  <span class="session-date-header"><i class="fa-regular fa-calendar-check"></i>${currentGroupDate}</span>`;
        }

        // 結果の文字列判定によるバッジカラー割り当て
        let badgeClass = "badge-default";
        const resultText = item.result || "-";
        const resLower = resultText.toLowerCase();

        if (resLower.includes("flash") || resLower.includes("フラッシュ")) {
            badgeClass = "badge-flash";
        } else if (resLower.includes("redpoint") || resLower.includes("rp") || resLower.includes("完登")) {
            badgeClass = "badge-rp";
        } else if (resLower.includes("attempt") || resLower.includes("トライ") || resLower.includes("投")) {
            badgeClass = "badge-atm";
        }

        const cleanLocation = (item.location || "").replace(/_/g, " ");

        // カードのHTMLモジュールを組み立て
        htmlBuffer += `  <div class="climb-card">`;
        htmlBuffer += `    <div class="card-header-row">`;
        htmlBuffer += `      <span class="card-location"><i class="fa-solid fa-location-dot"></i>${cleanLocation}</span>`;
        htmlBuffer += `      <span class="card-grade">${item.grade || "-"}</span>`;
        htmlBuffer += `    </div>`;
        htmlBuffer += `    <div class="card-body-row">`;
        htmlBuffer += `      <span class="card-target-name">${item.wall || "-"}</span>`;
        htmlBuffer += `    </div>`;
        htmlBuffer += `    <div class="card-footer-row">`;
        htmlBuffer += `      <span class="card-badge ${badgeClass}">${resultText}</span>`;
        htmlBuffer += `      <span class="card-style-info"><i class="fa-solid fa-angles-up"></i>${item.style || "-"}</span>`;
        htmlBuffer += `    </div>`;

        const memoText = item.memo || "";
        if (memoText && memoText.trim() !== "") {
            htmlBuffer += `    <div class="card-memo-box">`;
            htmlBuffer += `      <i class="fa-solid fa-quote-left"></i>${memoText}`;
            htmlBuffer += `    </div>`;
        }
        htmlBuffer += `  </div>`;
    });

    if (currentGroupDate !== "") {
        htmlBuffer += '</div>';
    }

    targetContainer.innerHTML = htmlBuffer;
}

/**
 * タブ切り替え時にデータを「input_source」ベースでフィルタリングして再描画する
 */
function filterTimeline(type) {
    const container = document.getElementById("timelineContainer");
    if (!container || !window.cachedClimbingData) return;

    // 1. タブボタンのActiveスタイルの切り替え
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

    // 2. 「input_source」列のフラグ（P001 / P002）によるデータ抽出処理
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

    // 3. 再描画を実行
    renderCardTimeline(filteredData, container);
}

// =========================================================================
// 3. フォーム画面（P001 / P002）専用：登録・トグル制御ロジック
// =========================================================================

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

    // パス名から安全にP001かP002かを識別し、判定値を格納
    const currentUrl = window.location.pathname;
    const isGymPage = currentUrl.includes("P001");
    params.append("input_source", isGymPage ? "P001" : "P002");

    // 重複送信を防ぎつつフォームパラメータをコピー
    formData.forEach((value, key) => {
        if (key !== "input_source") {
            params.append(key, value);
        }
    });

    params.set("grade", hiddenGrade.value);

    fetch(GAS_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    })
        .then(() => {
            if (messageDiv) {
                messageDiv.textContent = successMessage;
                messageDiv.className = "success";
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