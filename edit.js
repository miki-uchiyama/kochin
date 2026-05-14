// ========== 修正画面 ==========
// edit.js が読み込まれた時点で state が存在しない場合の対策
function getGroups() {
    if (typeof state !== 'undefined' && state.groups) return state.groups;
    return [];
  }

const SCORE_LABELS = ['集中力', '正確さ', 'スピード', '指示理解', '協調性'];
const HOURS = ['0.5h', '1.0h', '1.5h', '2.0h'];

function showEditMenu() {
  document.getElementById('edit-menu').style.display = 'block';
  document.getElementById('edit-by-date').style.display = 'none';
  document.getElementById('edit-by-member').style.display = 'none';
}

function showEditByDate() {
  document.getElementById('edit-menu').style.display = 'none';
  document.getElementById('edit-by-date').style.display = 'block';
}

function showEditByMember() {
  document.getElementById('edit-menu').style.display = 'none';
  document.getElementById('edit-by-member').style.display = 'block';
  renderEditMemberList();
}

function renderEditMemberList() {
  const list = document.getElementById('edit-member-list');
  list.innerHTML = '';
  members.forEach(name => {
    const btn = document.createElement('button');
    btn.style.cssText = 'width:100%;padding:14px;font-size:15px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);cursor:pointer;text-align:left;margin-bottom:4px;';
    btn.textContent = name;
    btn.onclick = () => loadEditByMember(name);
    list.appendChild(btn);
  });
}

async function loadEditByDate() {
  const date = document.getElementById('edit-date-picker').value;
  if (!date) { alert('日付を選んでください'); return; }
  const result = document.getElementById('edit-date-result');
  result.innerHTML = '<p style="text-align:center;padding:20px;">読み込み中...</p>';
  try {
    const month = date.substring(0, 7);
    const res = await fetch(`/api/exec?action=getRecords&month=${month}`);
    const data = await res.json();
    const filtered = (data.records || []).filter(r => r.date === date);
    if (filtered.length === 0) {
      result.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-muted);">この日のデータはありません</p>';
      return;
    }
    renderEditGrid(result, filtered, date);
  } catch(e) {
    result.innerHTML = '<p style="text-align:center;padding:20px;color:red;">読み込みエラー</p>';
  }
}

async function loadEditByMember(memberName) {
  const result = document.getElementById('edit-member-result');
  result.innerHTML = '<p style="text-align:center;padding:20px;">読み込み中...</p>';
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  try {
    const res = await fetch(`/api/exec?action=getRecords&month=${month}`);
    const data = await res.json();
    const filtered = (data.records || []).filter(r => r.name === memberName);
    if (filtered.length === 0) {
      result.innerHTML = `<p style="text-align:center;padding:20px;color:var(--text-muted);">${memberName}さんの今月のデータはありません</p>`;
      return;
    }
    renderEditGridByMember(result, filtered, memberName);
  } catch(e) {
    result.innerHTML = '<p style="text-align:center;padding:20px;color:red;">読み込みエラー</p>';
  }
}

function renderEditGrid(container, records, date) {
    let html = `<div style="margin-top:8px;">`;
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
      <button onclick="showEditTab('am')" id="edit-tab-am" style="padding:6px 16px;font-size:13px;border:2px solid var(--primary);border-radius:var(--radius-sm);background:var(--primary);color:#fff;cursor:pointer;">午前</button>
      <button onclick="showEditTab('pm')" id="edit-tab-pm" style="padding:6px 16px;font-size:13px;border:2px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);cursor:pointer;">午後</button>
    </div>`;
    html += renderEditTable(records, date, 'am');
    html += `</div>`;
  container.innerHTML = html;
  window._editRecords = records;
  window._editDate = date;
}

function showEditTab(tab) {
  document.getElementById('edit-tab-am').style.background = tab === 'am' ? 'var(--primary)' : 'var(--card)';
  document.getElementById('edit-tab-am').style.color = tab === 'am' ? '#fff' : 'var(--text)';
  document.getElementById('edit-tab-am').style.borderColor = tab === 'am' ? 'var(--primary)' : 'var(--border)';
  document.getElementById('edit-tab-pm').style.background = tab === 'pm' ? 'var(--primary)' : 'var(--card)';
  document.getElementById('edit-tab-pm').style.color = tab === 'pm' ? '#fff' : 'var(--text)';
  document.getElementById('edit-tab-pm').style.borderColor = tab === 'pm' ? 'var(--primary)' : 'var(--border)';
  const tableDiv = document.getElementById('edit-table-area');
  if (tableDiv) tableDiv.outerHTML = renderEditTable(window._editRecords, window._editDate, tab);
}

function renderEditTable(records, date, period) {
  const p = period; // 'am' or 'pm'
  const prefix = p === 'am' ? 'am' : 'pm';
  let html = `<div id="edit-table-area" style="overflow-x:auto;">`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:700px;">`;
  html += `<thead><tr style="background:var(--bg);">
    <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);min-width:80px;">利用者</th>
    <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);min-width:80px;">出席</th>
    <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);min-width:180px;">作業グループ</th>
    <th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">時間</th>
    ${SCORE_LABELS.map(l => `<th style="padding:8px;text-align:center;border-bottom:2px solid var(--border);">${l}</th>`).join('')}
    <th style="padding:8px;text-align:center;border-bottom:2px solid var(--border);">保存</th>
  </tr></thead><tbody>`;

  records.forEach((r, i) => {
    const absent = p === 'am' ? r.absent : r.pmAbsent;
    const group = p === 'am' ? (r.amGroup || '') : (r.pmGroup || '');
    const hours = p === 'am' ? (r.amHours || 2) : (r.pmHours || 2);
    const scores = p === 'am' ? (r.amScores || [3,3,3,3,3]) : (r.pmScores || [3,3,3,3,3]);

    html += `<tr style="border-bottom:1px solid var(--border);">`;
    html += `<td style="padding:8px;font-weight:600;">${r.name}</td>`;
    
    // 出席ボタン
    html += `<td style="padding:8px;">
      <button onclick="toggleEditAbsent(${i},'${p}')" id="edit-absent-${p}-${i}" style="font-size:11px;padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;background:${absent ? '#fee2e2' : '#dcfce7'};color:${absent ? '#dc2626' : '#16a34a'};">
        ${absent ? '欠席' : '出席'}
      </button>
    </td>`;

    // 作業グループ
    html += `<td style="padding:8px;">
      <select id="edit-group-${p}-${i}" style="width:100%;font-size:12px;padding:4px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);">
      ${getGroups().map(g => `<option value="${g.id}" ${String(r[prefix+'Group']) === String(g.id) ? 'selected' : ''}>G${g.id} (x${g.coef}) ${g.name}</option>`).join('')}
      </select>
    </td>`;

    // 作業時間
    html += `<td style="padding:8px;">
      <div style="display:flex;gap:2px;">
        ${HOURS.map((h, hi) => `<button onclick="selectEditHour(${i},'${p}',${hi+1})" id="edit-hour-${p}-${i}-${hi+1}" style="padding:3px 5px;font-size:11px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:${(hours*2) === (hi+1) ? 'var(--primary)' : 'var(--card)'};color:${(hours*2) === (hi+1) ? '#fff' : 'var(--text)'};">${h}</button>`).join('')}
      </div>
    </td>`;

    // スコア
    SCORE_LABELS.forEach((label, si) => {
      const currentScore = scores[si] || 3;
      html += `<td style="padding:8px;">
        <div style="display:flex;gap:2px;justify-content:center;">
          ${[1,2,3,4,5].map(n => `<button onclick="selectEditScore(${i},'${p}',${si},${n})" id="edit-score-${p}-${i}-${si}-${n}" style="width:24px;height:24px;font-size:11px;border:1px solid var(--border);border-radius:50%;cursor:pointer;background:${currentScore === n ? 'var(--primary)' : 'var(--card)'};color:${currentScore === n ? '#fff' : 'var(--text)'};">${n}</button>`).join('')}
        </div>
      </td>`;
    });

    // 保存ボタン
    html += `<td style="padding:8px;text-align:center;">
      <button onclick="saveEditRecord(${i},'${p}')" style="font-size:12px;padding:6px 12px;border:none;border-radius:var(--radius-sm);background:var(--primary);color:#fff;cursor:pointer;">保存</button>
    </td>`;
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

function toggleEditAbsent(i, p) {
  const btn = document.getElementById(`edit-absent-${p}-${i}`);
  const isAbsent = btn.textContent.trim() === '欠席';
  btn.textContent = isAbsent ? '出席' : '欠席';
  btn.style.background = isAbsent ? '#dcfce7' : '#fee2e2';
  btn.style.color = isAbsent ? '#16a34a' : '#dc2626';
}

function selectEditHour(i, p, val) {
  HOURS.forEach((h, hi) => {
    const btn = document.getElementById(`edit-hour-${p}-${i}-${hi+1}`);
    if (btn) {
      btn.style.background = (hi+1) === val ? 'var(--primary)' : 'var(--card)';
      btn.style.color = (hi+1) === val ? '#fff' : 'var(--text)';
    }
  });
}

function selectEditScore(i, p, si, val) {
  [1,2,3,4,5].forEach(n => {
    const btn = document.getElementById(`edit-score-${p}-${i}-${si}-${n}`);
    if (btn) {
      btn.style.background = n === val ? 'var(--primary)' : 'var(--card)';
      btn.style.color = n === val ? '#fff' : 'var(--text)';
    }
  });
}

async function saveEditRecord(i, p) {
  const r = window._editRecords[i];
  const prefix = p === 'am' ? 'am' : 'pm';
  const absentBtn = document.getElementById(`edit-absent-${p}-${i}`);
  const absent = absentBtn.textContent.trim() === '欠席';
  const groupEl = document.getElementById(`edit-group-${p}-${i}`);
  const group = groupEl ? groupEl.value : r[prefix+'Group'];
  
  let hours = r[prefix+'Hours'] || 2;
  HOURS.forEach((h, hi) => {
    const btn = document.getElementById(`edit-hour-${p}-${i}-${hi+1}`);
    if (btn && btn.style.background.includes('primary') || btn && getComputedStyle(btn).backgroundColor !== getComputedStyle(document.body).backgroundColor) {
      // 選択中のボタンを探す
    }
  });
  // 時間を取得
  for (let hi = 1; hi <= 4; hi++) {
    const btn = document.getElementById(`edit-hour-${p}-${i}-${hi}`);
    if (btn && (btn.style.background === 'var(--primary)' || btn.style.background.includes('var(--primary)'))) {
      hours = hi * 0.5;
      break;
    }
  }

  const scores = SCORE_LABELS.map((label, si) => {
    for (let n = 5; n >= 1; n--) {
      const btn = document.getElementById(`edit-score-${p}-${i}-${si}-${n}`);
      if (btn && btn.style.background === 'var(--primary)') return n;
    }
    return r[prefix+'Scores'] ? r[prefix+'Scores'][si] : 3;
  });

  const updated = { ...r };
  if (p === 'am') {
    updated.absent = absent;
    updated.amGroup = group;
    updated.amHours = hours;
    updated.amScores = scores;
  } else {
    updated.pmAbsent = absent;
    updated.pmGroup = group;
    updated.pmHours = hours;
    updated.pmScores = scores;
  }

  try {
    const res = await fetch('/api/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveRecord', ...updated })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(`${r.name}のデータを保存しました`);
      window._editRecords[i] = updated;
    } else {
      alert('保存に失敗しました');
    }
  } catch(e) {
    alert('保存エラー: ' + e.message);
  }
}

function renderEditGridByMember(container, records, memberName) {
  let html = `<div class="card" style="margin-top:12px;">`;
  html += `<div class="card-title">${memberName}さんの今月のデータ</div>`;
  html += `<p style="color:var(--text-muted);font-size:13px;">日付をクリックして修正してください</p>`;
  records.forEach(r => {
    html += `<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:15px;">${r.date}</span>
      <button onclick="loadEditByDateForMember('${r.date}')" style="font-size:13px;padding:6px 14px;border:1px solid var(--primary);border-radius:var(--radius-sm);background:var(--primary);color:#fff;cursor:pointer;">修正</button>
    </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

async function loadEditByDateForMember(date) {
  document.getElementById('edit-date-picker').value = date;
  showEditByDate();
  await loadEditByDate();
}