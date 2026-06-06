/**
 * クライミング管理システム - 共通コアスクリプト（input_source対応・項目差分拡張版）
 */

// ルーティングオブジェクト
window.RouteSelector = {
    moveTo: function (pageCode) {
        if (!pageCode) return;
        window.location.href = '../xhtml/' + pageCode + '.xhtml';
    }
};

// =========================================================================
// 1. 画面読み込み時の初期化処理（すべての画面のイベントを一元管理）
// =========================================================================
window.cachedClimbingData = [];

document.addEventListener("DOMContentLoaded", function () {

    // ─── 【重要】現在地のナビゲーション自動判定・付与 ───
    const path = window.location.pathname;
    const navMap = [
        { id: 'nav-P001', key: 'P001' },
        { id: 'nav-P002', key: 'P002' },
        { id: 'nav-P003', key: 'P003' }
    ];

    navMap.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            // パスに該当するキーが含まれていれば active を付与
            if (path.includes(item.key)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

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

    // ─── 履歴画面用（P003）の初期化 ───
    const timelineContainer = document.getElementById("timelineContainer");
    if (timelineContainer) {
        const gasEndpointInput = document.getElementById("gasEndpoint");
        const statusMessage = document.getElementById("historyStatus");

        if (!gasEndpointInput || !gasEndpointInput.value) {
            showError("システムエラー: 接続先URLが見つかりません。");
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
                showError("履歴データの読み込みに失敗しました。");
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

        const cleanLocation = String(item.location || "").replace(/_/g, " ");

        // カードのHTMLモジュール組み立て
        htmlBuffer += `  <div class="climb-card" style="position: relative; cursor: pointer;" data-no="${item.no}" onclick="openEditModal('${item.no}')">`;
        htmlBuffer += `    <span class="card-no-badge" style="position: absolute; top: 8px; right: 12px; font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">No.${item.no || "-"}</span>`;
        htmlBuffer += `    <div class="card-header-row" style="padding-right: 45px;">`;
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

        // 外岩（P002）専用の拡張詳細項目表示エリア
        let detailsHtml = "";
        if (item.input_source === "P002" && item.details) {
            const d = item.details;
            detailsHtml += `<div class="card-sub-details" style="font-size:0.85rem; color:var(--text-muted); margin-top:6px; border-top:1px dashed var(--border); padding-top:6px; line-height:1.4;">`;
            if (d.rock_area && d.rock_area !== "-") {
                detailsHtml += `<div><i class="fa-solid fa-map-pin" style="width:16px;"></i><strong>エリア:</strong> ${d.rock_area}</div>`;
            }
            if (d.hold_type && d.hold_type !== "-") {
                detailsHtml += `<div><i class="fa-solid fa-hand" style="width:16px;"></i><strong>ホールド:</strong> ${d.hold_type}</div>`;
            }
            if (d.weather_info && d.weather_info !== "-") {
                detailsHtml += `<div><i class="fa-solid fa-cloud-sun" style="width:16px;"></i><strong>環境:</strong> ${d.weather_info}</div>`;
            }
            detailsHtml += `</div>`;
        }

        const memoText = item.memo || "";
        if ((memoText && memoText.trim() !== "" && memoText !== "-") || detailsHtml !== "") {
            htmlBuffer += `    <div class="card-memo-box">`;
            if (memoText && memoText !== "-") {
                htmlBuffer += `      <i class="fa-solid fa-quote-left"></i>${memoText}`;
            }
            htmlBuffer += detailsHtml;
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
        mode: "no-cors",
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

// =========================================================================
// 4. 履歴編集モーダル 制御・通信ロジック (P003追加分)
// =========================================================================

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
        mode: "no-cors",
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