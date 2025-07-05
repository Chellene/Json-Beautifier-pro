// --- JSON Beautifier PRO 2025 ---
let lastJSON = '';
let undoStack = [];
let redoStack = [];
let favs = JSON.parse(localStorage.getItem('favs') || '[]');

// PRO SIEMPRE ACTIVADO PARA PRUEBA DEMO
let isPro = true;
localStorage.setItem('jsonpro', '1');

// Helpers de tema y botón modo oscuro
function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  document.getElementById('toggle-theme').textContent = dark ? "☀️" : "🌗";
}
document.getElementById('toggle-theme').onclick = () => setTheme(!document.body.classList.contains('dark'));
setTheme(localStorage.getItem('theme') === 'dark');

// --- Selección y carga de archivos ---
const btnFile = document.getElementById('btn-file');
const fileInput = document.getElementById('file-input');
const input = document.getElementById('json-input');
btnFile.onclick = () => fileInput.click();
fileInput.onchange = e => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    input.value = evt.target.result;
    // NO formatea automáticamente, espera a que pulses Formatear
  };
  reader.readAsText(file);
};

// --- Panel PRO ---
function showProPanel() {
  document.getElementById('pro-panel').classList.remove('hidden');
  setTimeout(() => window.scrollTo(0, 0), 80);
}
function hideProPanel() {
  document.getElementById('pro-panel').classList.add('hidden');
}
if (document.getElementById('close-pro-panel')) {
  document.getElementById('close-pro-panel').onclick = hideProPanel;
}

// --- Copiar SIEMPRE habilitado (gratis) ---
const output = document.getElementById('json-output');
document.getElementById('btn-copy').onclick = () => {
  // Detecta qué pestaña está activa
  if (document.getElementById('tab-formatted').classList.contains('active')) {
    navigator.clipboard.writeText(output.textContent);
    flashMsg('¡Copiado!', "#27d67c");
  } else if (document.getElementById('tab-convert').classList.contains('active')) {
    navigator.clipboard.writeText(convertedOutput.textContent);
    flashMsg('¡Convertido copiado!', "#27d67c");
  } else if (document.getElementById('tab-tree').classList.contains('active')) {
    // Copiar la vista árbol como texto
    const plainTree = treeOutput.innerText || treeOutput.textContent;
    navigator.clipboard.writeText(plainTree.trim());
    flashMsg('¡Vista árbol copiada!', "#27d67c");
  } else {
    flashMsg('Nada para copiar', "#e54d4d");
  }
};

const treeOutput = document.getElementById('tree-output');
const convertedOutput = document.getElementById('converted-output');
const favsOutput = document.getElementById('favs-output');
// Maneja los botones "Cargar" y "Eliminar" de favoritos con delegación de eventos
favsOutput.onclick = function(e) {
  if (e.target.classList.contains('load-fav')) {
    const name = decodeURIComponent(e.target.getAttribute('data-name'));
    const fav = favs.find(f => f.name === name);
    if (fav) {
      input.value = fav.json;
      format();
      show('formatted');
    }
  }
  if (e.target.classList.contains('del-fav')) {
    const name = decodeURIComponent(e.target.getAttribute('data-name'));
    if (!isPro) return showProPanel();
    if (!confirm(`¿Seguro que quieres borrar el favorito "${name}"?`)) return;
    favs = favs.filter(f => f.name !== name);
    localStorage.setItem('favs', JSON.stringify(favs));
    showFavs();
  }
};

const favBtn = document.getElementById('btn-fav');
const shareBtn = document.getElementById('btn-share');
const undoBtn = document.getElementById('btn-undo');
const redoBtn = document.getElementById('btn-redo');
const clearBtn = document.getElementById('btn-clear');
const validateBtn = document.getElementById('btn-validate');
const formatBtn = document.getElementById('btn-format');
const indentSel = document.getElementById('indent');

// --- Undo / Redo / Limpiar ---
function pushUndo() {
  undoStack.push(input.value);
  if (undoStack.length > 40) undoStack.shift();
}
function undo() {
  if (undoStack.length > 0) {
    redoStack.push(input.value);
    input.value = undoStack.pop();
    format();
  }
}
function redo() {
  if (redoStack.length > 0) {
    pushUndo();
    input.value = redoStack.pop();
    format();
  }
}
undoBtn.onclick = undo;
redoBtn.onclick = redo;
clearBtn.onclick = () => {
  pushUndo();
  input.value = "";
  output.textContent = "";
  treeOutput.innerHTML = "";
  convertedOutput.textContent = "";
  document.getElementById('csv-table-panel').classList.add('hidden');
};

// --- Formatear ---
function format() {
  try {
    const json = JSON.parse(input.value);
    lastJSON = JSON.stringify(json, null, +indentSel.value);
    output.textContent = lastJSON;
    output.style.color = "#fff";
    show('formatted');
    drawTreePro(json);
  } catch (e) {
    output.textContent = "❌ Error: " + e.message;
    output.style.color = "#e95e5e";
  }
}
formatBtn.onclick = () => {
  pushUndo();
  format();
};
indentSel.onchange = format;

// --- Tabs de salida ---
function show(tab) {
  document.getElementById('json-output').classList.toggle('hidden', tab !== 'formatted');
  document.getElementById('tree-output').classList.toggle('hidden', tab !== 'tree');
  document.getElementById('converted-output').classList.toggle('hidden', tab !== 'convert');
  document.getElementById('favs-output').classList.toggle('hidden', tab !== 'favs');
  document.getElementById('csv-table-panel').classList.add('hidden');
  Array.from(document.querySelectorAll('.output-tabs button')).forEach(btn =>
    btn.classList.toggle('active', btn.id === 'tab-' + tab));
}
show('formatted');

document.getElementById('tab-formatted').onclick = () => show('formatted');
document.getElementById('tab-tree').onclick = () => show('tree');
document.getElementById('tab-convert').onclick = () => show('convert');
document.getElementById('tab-favs').onclick = e => {
  if (!isPro) return showProPanel();
  showFavs();
};

// --- Guardar favorito (PRO) ---
favBtn.onclick = e => {
  if (!isPro) return showProPanel();
  if (!input.value.trim()) return;
  const name = prompt("Nombre para el favorito:");
  if (!name) return;
  favs.push({ name, json: input.value });
  localStorage.setItem('favs', JSON.stringify(favs));
  alert('Guardado en favoritos');
};

// --- Favoritos visual (PRO) ---
function showFavs() {
  favsOutput.innerHTML = '<ul>' +
    favs.map(f =>
      `<li>
         <b>${f.name}</b>
         <button class="load-fav" data-name="${encodeURIComponent(f.name)}">Cargar</button>
         <button class="del-fav" data-name="${encodeURIComponent(f.name)}">🗑️ Eliminar</button>
       </li>`
    ).join('') +
    '</ul>';
  show('favs');
}



window.deleteFav = name => {
  if (!isPro) return showProPanel();
  if (!confirm(`¿Seguro que quieres borrar el favorito "${name}"?`)) return;
  favs = favs.filter(f => f.name !== name);
  localStorage.setItem('favs', JSON.stringify(favs));
  showFavs();
};


// --- Compartir (si navegador lo soporta) ---
shareBtn.onclick = () => {
  if (!navigator.share) return alert('No soportado');
  navigator.share({
    title: "JSON Beautifier PRO",
    text: input.value,
    url: location.href
  });
};
// --- Exportar a CSV (Gratis) ---
document.getElementById('btn-csv').onclick = () => {
  try {
    const json = JSON.parse(input.value);
    const csv = jsonToCsv(json);
    convertedOutput.textContent = csv;
    show('convert');
    // Visualizar tabla
    if (Array.isArray(json)) {
      renderCsvTable(json);
    } else {
      document.getElementById('csv-table-panel').classList.add('hidden');
    }
  } catch (e) {
    convertedOutput.textContent = "❌ Error: " + e.message;
    document.getElementById('csv-table-panel').classList.add('hidden');
    show('convert');
  }
};

// --- Exportar a Excel (.xlsx) (PRO, aplanado) ---
document.getElementById('btn-excel').onclick = () => {
  if (!isPro) return showProPanel();
  try {
    const json = JSON.parse(input.value);
    exportToExcel(json);
  } catch (e) {
    alert("JSON no válido: " + e.message);
  }
};

// --- Exportar a YAML (PRO) ---
document.getElementById('btn-yaml').onclick = () => {
  if (!isPro) return showProPanel();
  try {
    const json = JSON.parse(input.value);
    const yaml = jsonToYaml(json);
    convertedOutput.textContent = yaml;
    show('convert');
  } catch (e) {
    convertedOutput.textContent = "❌ Error: " + e.message;
    show('convert');
  }
};

// --- Descargar JSON (PRO) ---
document.getElementById('btn-download').onclick = () => {
  if (!isPro) return showProPanel();
  const blob = new Blob([input.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "archivo.json";
  a.click();
  URL.revokeObjectURL(url);
};

// --- Convertir a XML (Gratis) ---
document.getElementById('btn-xml').onclick = () => {
  try {
    const json = JSON.parse(input.value);
    const xml = jsonToXml(json, "root");
    convertedOutput.textContent = formatXml(xml);
    show('convert');
  } catch (e) {
    convertedOutput.textContent = "❌ Error: " + e.message;
    show('convert');
  }
};

// --- Helpers de conversión ---
function jsonToCsv(obj) {
  let arr = Array.isArray(obj) ? obj : [obj];
  if (!arr.length || typeof arr[0] !== 'object') throw new Error("No es un array válido para CSV");
  const fields = Object.keys(arr.reduce((a, b) => ({ ...a, ...b }), {}));
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = arr.map(row => fields.map(f => escape(row[f] ?? '')).join(','));
  return fields.join(',') + '\n' + rows.join('\n');
}
function renderCsvTable(arr) {
  if (!Array.isArray(arr) || !arr.length) return;
  const fields = Object.keys(arr.reduce((a, b) => ({ ...a, ...b }), {}));
  let html = `<table><thead><tr>${fields.map(f => `<th>${f}</th>`).join('')}</tr></thead><tbody>`;
  for (const row of arr) {
    html += `<tr>${fields.map(f => `<td>${row[f] !== undefined ? row[f] : ''}</td>`).join('')}</tr>`;
  }
  html += `</tbody></table>`;
  const panel = document.getElementById('csv-table-panel');
  panel.innerHTML = html;
  panel.classList.remove('hidden');
}
// --- Excel aplanado PRO ---
function exportToExcel(json) {
  if (!window.XLSX) {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => exportToExcel(json);
    document.body.appendChild(script);
    return;
  }
  const arr = Array.isArray(json) ? json : [json];
  const flatArr = arr.map(flattenObject);
  const ws = XLSX.utils.json_to_sheet(flatArr);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, "archivo.xlsx");
}
function flattenObject(obj, prefix = '') {
  let result = {};
  for (let key in obj) {
    if (!Object.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, pre + key));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object' && v !== null) {
          Object.assign(result, flattenObject(v, `${pre}${key}.${i}`));
        } else {
          result[`${pre}${key}.${i}`] = v;
        }
      });
    } else {
      result[pre + key] = value;
    }
  }
  return result;
}
function jsonToYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    return obj.map(item => `${pad}- ${typeof item === 'object' ? '\n' + jsonToYaml(item, indent + 1) : item}`).join('\n');
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj)
      .map(([k, v]) => `${pad}${k}: ${typeof v === 'object' ? '\n' + jsonToYaml(v, indent + 1) : v}`)
      .join('\n');
  } else {
    return pad + obj;
  }
}
function jsonToXml(obj, nodeName) {
  if (typeof obj !== 'object' || obj === null) {
    return `<${nodeName}>${String(obj)}</${nodeName}>`;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => jsonToXml(item, nodeName)).join('');
  }
  let xml = `<${nodeName}>`;
  for (let key in obj) {
    xml += jsonToXml(obj[key], key);
  }
  xml += `</${nodeName}>`;
  return xml;
}
function formatXml(xml) {
  let formatted = '';
  const reg = /(>)(<)(\/*)/g;
  xml = xml.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach(node => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) indent = 0;
    else if (node.match(/^<\/\w/)) {
      if (pad !== 0) pad -= 2;
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) indent = 2;
    formatted += ' '.repeat(pad) + node + '\r\n';
    pad += indent;
  });
  return formatted.trim();
}
// --- Mensaje flash temporal ---
function flashMsg(msg, color = "#32ba7c") {
  output.textContent = msg;
  output.style.color = color;
  setTimeout(() => { output.textContent = lastJSON; output.style.color = "#fff"; }, 1800);
}
// --- Arrastrar y soltar archivos JSON ---
input.addEventListener('dragover', e => {
  e.preventDefault();
  input.style.border = "2.5px dashed var(--accent)";
});
input.addEventListener('dragleave', e => {
  input.style.border = '';
});
input.addEventListener('drop', e => {
  e.preventDefault();
  input.style.border = '';
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    input.value = evt.target.result;
    // NO autoformatear; pulsa “Formatear”
  };
  reader.readAsText(file);
});
// --- Vista árbol PRO plegable/desplegable ---
function drawTreePro(json) {
  treeOutput.innerHTML = '';
  treeOutput.appendChild(buildTreeNode(json));
}
function buildTreeNode(obj, key = '', parentLevel = 0) {
  const node = document.createElement('div');
  node.className = 'tree-node';
  if (typeof obj === 'object' && obj !== null) {
    const isArray = Array.isArray(obj);
    const keys = isArray ? obj.map((_, i) => i) : Object.keys(obj);
    const container = document.createElement('div');
    container.className = 'tree-branch';
    const expander = document.createElement('span');
    expander.textContent = '▶';
    expander.className = 'expander';
    expander.onclick = function (e) {
      e.stopPropagation();
      branch.classList.toggle('collapsed');
      expander.textContent = branch.classList.contains('collapsed') ? '▶' : '▼';
    };
    const branch = document.createElement('div');
    branch.className = 'tree-children';
    // Cabecera
    const head = document.createElement('span');
    head.className = 'tree-key';
    if (key !== '') head.innerHTML = `<b>${key}</b>: `;
    head.innerHTML += isArray
      ? `<span class="tree-type">[${obj.length}]</span>`
      : `<span class="tree-type">{${keys.length}}</span>`;
    container.appendChild(expander);
    container.appendChild(head);
    container.appendChild(branch);
    node.appendChild(container);
    // Hijos
    for (let k of keys) {
      branch.appendChild(buildTreeNode(obj[k], isArray ? `[${k}]` : k, parentLevel + 1));
    }
    if (parentLevel > 0) branch.classList.add('collapsed'); // Por defecto plegados salvo raíz
    expander.textContent = branch.classList.contains('collapsed') ? '▶' : '▼';
    // Toggle todo el nodo
    container.onclick = function (e) {
      if (e.target === expander) return;
      branch.classList.toggle('collapsed');
      expander.textContent = branch.classList.contains('collapsed') ? '▶' : '▼';
    };
  } else {
    // Valor simple
    node.innerHTML = key !== '' ? `<span class="tree-key"><b>${key}</b>:</span> ` : '';
    node.innerHTML += `<span class="tree-value">${highlightValue(obj)}</span>`;
    node.className += ' tree-leaf';
  }
  return node;
}
function highlightValue(val) {
  if (val === null) return `<span class="tree-null">null</span>`;
  if (typeof val === 'string') return `<span class="tree-str">"${val}"</span>`;
  if (typeof val === 'number') return `<span class="tree-num">${val}</span>`;
  if (typeof val === 'boolean') return `<span class="tree-bool">${val}</span>`;
  return `<span>${val}</span>`;
}

// --- Validación premium automática, casilla siempre visible ---
const autovalChk = document.getElementById('autovalidate-checkbox');
let autoValidateEnabled = false;

autovalChk.onchange = function () {
  autoValidateEnabled = this.checked;
  if (autoValidateEnabled) {
    input.addEventListener('input', autoValidateHandler);
    autoValidateHandler(); // Valida al activar
  } else {
    input.removeEventListener('input', autoValidateHandler);
  }
};

// Lógica de validación automática
function autoValidateHandler() {
  try {
    JSON.parse(input.value);
    showValidationMsg("✅ JSON válido", "limegreen");
  } catch (e) {
    const { line, column } = getLineColumn(input.value, e.message);
    showValidationMsg(
      `❌ Error: ${e.message}` +
      (line ? ` <b>(Línea ${line}, columna ${column})</b>` : ""),
      "#e95e5e",
      true
    );
  }
}

// Validación manual (botón)
validateBtn.onclick = () => {
  try {
    JSON.parse(input.value);
    showValidationMsg("✅ JSON válido", "limegreen");
  } catch (e) {
    const { line, column } = getLineColumn(input.value, e.message);
    showValidationMsg(
      `❌ Error: ${e.message}` +
      (line ? ` <b>(Línea ${line}, columna ${column})</b>` : ""),
      "#e95e5e",
      true
    );
  }
};

// Mensaje en el output principal
function showValidationMsg(msg, color = "#32ba7c", html = false) {
  if (html) {
    output.innerHTML = msg;
  } else {
    output.textContent = msg;
  }
  output.style.color = color;
}

// Helper para línea y columna del error
function getLineColumn(str, errorMsg) {
  const match = errorMsg.match(/at position (\d+)/) || errorMsg.match(/at (\d+)/);
  if (!match) return { line: null, column: null };
  const pos = +match[1];
  const lines = str.substring(0, pos).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}
// --- Botón Copiar multipestaña premium ---
document.getElementById('btn-copy').onclick = () => {
  // Detecta pestaña activa
  if (document.getElementById('tab-formatted').classList.contains('active')) {
    navigator.clipboard.writeText(document.getElementById('json-output').textContent);
    flashMsg('¡Copiado!', "#32ba7c");
  } else if (document.getElementById('tab-convert').classList.contains('active')) {
    navigator.clipboard.writeText(document.getElementById('converted-output').textContent);
    flashMsg('¡Convertido copiado!', "#32ba7c");
  } else if (document.getElementById('tab-tree').classList.contains('active')) {
    const plainTree = document.getElementById('tree-output').innerText || document.getElementById('tree-output').textContent;
    navigator.clipboard.writeText(plainTree.trim());
    flashMsg('¡Vista árbol copiada!', "#32ba7c");
  } else {
    flashMsg('Nada para copiar', "#e54d4d");
  }
};

// --- Toast animado premium ---
function flashMsg(msg, color = "#32ba7c") {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = color.startsWith('#')
    ? color
    : "linear-gradient(90deg, #32ba7c 80%, #3e89fa 100%)";
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}
