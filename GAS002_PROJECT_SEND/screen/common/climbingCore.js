/**
 * クライミング管理システム - 共通コアスクリプト（完全一元化バージョン）
 */

// ルーティングオブジェクト
window.RouteSelector = {
    moveTo: function(pageCode) {
        if (!pageCode) return;
        window.location.href = './' + pageCode + '.xhtml';
    }
};

// 画面読み込み時の初期化処理
document.addEventListener("DOMContentLoaded", function() {
    // 1. フォーム送信イベントの動的紐付け
    const form = document.getElementById("climbingForm");
    if (form) {
        form.addEventListener("submit", submitClimbingForm);
    }

    // 2. デートピッカー制御（枠内のどこをクリックしてもカレンダーを強制展開）
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(function(input) {
        input.addEventListener('click', function() {
            if (typeof this.showPicker === 'function') {
                this.showPicker();
            }
        });
        input.addEventListener('focus', function() {
            if (typeof this.showPicker === 'function') {
                this.showPicker();
            }
        });
    });
});

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
        // V-Gradeを有効化
        gradeJp.classList.add("hidden");
        gradeJp.removeAttribute("required");
        gradeJp.value = ""; // 非表示側の選択をクリア

        gradeV.classList.remove("hidden");
        gradeV.setAttribute("required", "required");
        
        labelJp.classList.remove("active");
        labelV.classList.add("active");
    } else {
        // 日本グレードを有効化
        gradeV.classList.add("hidden");
        gradeV.removeAttribute("required");
        gradeV.value = ""; // 非表示側の選択をクリア

        gradeJp.classList.remove("hidden");
        gradeJp.setAttribute("required", "required");
        
        labelV.classList.remove("active");
        labelJp.classList.add("active");
    }

    if (hiddenGrade) {
        hiddenGrade.value = "";
    }
}

/**
 * 選択されたプルダウンの「コード値（value）」を隠しフィールド（#grade）に同期する
 */
function syncGradeValue(selectElement) {
    const hiddenGrade = document.getElementById("grade");
    if (hiddenGrade && selectElement) {
        // text（見出し）ではなく、GASのマスタが待っている value（コード値）をセットする
        hiddenGrade.value = selectElement.value;
    }
}

/**
 * フォーム送信処理（GAS一元連携型）
 */
function submitClimbingForm(event) {
    event.preventDefault();
    
    const form = document.getElementById("climbingForm");
    const hiddenGrade = document.getElementById("grade");
    const toggle = document.getElementById("gradeSystemToggle");
    
    // 送信直前に、現在アクティブなプルダウンから値を確実に回収する防御コード
    if (hiddenGrade && toggle) {
        const activeSelect = toggle.checked ? document.getElementById("gradeV") : document.getElementById("gradeJp");
        if (activeSelect && activeSelect.value) {
            hiddenGrade.value = activeSelect.value;
        }
    }

    // グレードが未選択ならブロック
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

   // フォーム内のすべての入力をオブジェクト化
    const formData = new FormData(form);
    const params = new URLSearchParams();
    
    formData.forEach((value, key) => {
        params.append(key, value);
    });

    // 念押しで最新の確実なグレードコードを注入
    params.set("grade", hiddenGrade.value);

    // GASへ確実に届くフォームデータ形式で送信
    fetch(GAS_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors", // CORSエラーを回避
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