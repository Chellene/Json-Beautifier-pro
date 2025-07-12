// --- JSON Beautifier PRO 2025 ---
let lastJSON = '';
let undoStack = [];
let redoStack = [];
let favs = JSON.parse(localStorage.getItem('favs') || '[]');
let isPro = true;
localStorage.setItem('jsonpro', '1');

function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  document.getElementById('toggle-theme').textContent = dark ? "☀️" : "🌗";
}
document.getElementById('toggle-theme').onclick = () => setTheme(!document.body.classList.contains('dark'));
setTheme(localStorage.getItem('theme') === 'dark');

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
    flashMsg('Archivo cargado', "#32ba7c");
  };
  reader.readAsText(file);
};
// --- Bloquea drag & drop nativo que abre el archivo en el navegador ---
window.addEventListener('dragover', function(e) {
  e.preventDefault();
});
window.addEventListener('drop', function(e) {
  e.preventDefault();
});

// --- Permite cargar archivos arrastrados al área de entrada JSON ---
input.addEventListener('drop', function(e) {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = evt => {
      input.value = evt.target.result;
      flashMsg('Archivo cargado por arrastrar', "#32ba7c");
      // Si quieres, puedes llamar a format() aquí, pero mejor lo deja al usuario
    };
    reader.readAsText(file);
  }
});

const autovalidateBox = document.getElementById('autovalidate-checkbox');
input.addEventListener('input', () => {
  if (autovalidateBox && autovalidateBox.checked) {
    validateJSON();
  }
});

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

const output = document.getElementById('json-output');
const treeOutput = document.getElementById('tree-output');
const convertedOutput = document.getElementById('converted-output');
const favsOutput = document.getElementById('favs-output');

document.getElementById('btn-copy').onclick = () => {
  if (document.getElementById('tab-formatted').classList.contains('active')) {
    navigator.clipboard.writeText(output.textContent);
    flashMsg('¡Copiado!', "#27d67c");
  } else if (document.getElementById('tab-convert').classList.contains('active')) {
    navigator.clipboard.writeText(convertedOutput.textContent);
    flashMsg('¡Convertido copiado!', "#27d67c");
  } else if (document.getElementById('tab-tree').classList.contains('active')) {
    const area = document.getElementById('tree-area-pro');
    const plainTree = area ? area.innerText : (treeOutput.innerText || treeOutput.textContent);
    navigator.clipboard.writeText(plainTree.trim());
    flashMsg('¡Vista árbol copiada!', "#27d67c");
  } else {
    flashMsg('Nada para copiar', "#e54d4d");
  }
};

favsOutput.onclick = function(e) {
  if (e.target.classList.contains('load-fav')) {
    const name = decodeURIComponent(e.target.getAttribute('data-name'));
    const fav = favs.find(f => f.name === name);
    if (fav) {
      input.value = fav.json;
      format();
      show('formatted');
      flashMsg('Favorito cargado', "#32ba7c");
    }
  }
  if (e.target.classList.contains('del-fav')) {
    const name = decodeURIComponent(e.target.getAttribute('data-name'));
    if (!isPro) return showProPanel();
    if (!confirm(`¿Seguro que quieres borrar el favorito "${name}"?`)) return;
    favs = favs.filter(f => f.name !== name);
    localStorage.setItem('favs', JSON.stringify(favs));
    showFavs();
    flashMsg('Favorito eliminado', "#e54d4d");
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

// --- Helper para línea y columna del error JSON ---
function getLineColumn(text, msg) {
  const match = msg.match(/position (\d+)/i);
  if (!match) return { line: 1, column: 1 };
  const pos = parseInt(match[1], 10);
  const lines = text.slice(0, pos).split('\n');
  return {
    line: lines.length,
    column: pos - (text.lastIndexOf('\n', pos - 1) + 1) + 1
  };
}

// --- Validar JSON ---
function validateJSON() {
  if (!input.value.trim()) {
    flashMsg('Nada que validar', "#e54d4d");
    return;
  }
  try {
    JSON.parse(input.value);
    flashMsg("✅ JSON válido", "limegreen");
  } catch (e) {
    const { line, column } = getLineColumn(input.value, e.message);
    flashMsg(`❌ No válido: ${e.message} (Línea ${line}, columna ${column})`, "#e54d4d");
  }
}
validateBtn.onclick = validateJSON;


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
    flashMsg('Deshecho', "#32ba7c");
  }
}
function redo() {
  if (redoStack.length > 0) {
    pushUndo();
    input.value = redoStack.pop();
    format();
    flashMsg('Rehecho', "#32ba7c");
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
  flashMsg('Limpiado', "#e54d4d");
};

// --- Formatear ---
function format() {
  if (!input.value.trim()) {
    output.textContent = "";
    treeOutput.innerHTML = "";
    convertedOutput.textContent = "";
    return;
  }
  try {
    const json = JSON.parse(input.value);
    lastJSON = JSON.stringify(json, null, +indentSel.value);
    output.textContent = lastJSON;
    output.style.color = "#fff";
    show('formatted');
    drawTreePro(json);
    flashMsg('JSON formateado', "#32ba7c");
  } catch (e) {
    output.textContent = "❌ Error: " + e.message;
    output.style.color = "#e95e5e";
    flashMsg('Error de formato: ' + e.message, "#e54d4d");
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

document.getElementById('tab-formatted').onclick = () => {
  format();
  show('formatted');
};
document.getElementById('tab-tree').onclick = () => {
  try {
    const json = JSON.parse(input.value);
    drawTreePro(json);
    flashMsg('Vista árbol generada', "#32ba7c");
  } catch (e) {
    const { line, column } = getLineColumn(input.value, e.message);
    treeOutput.innerHTML = `<div style="color:#e95e5e;padding:1.2em;font-weight:600;">
      ❌ JSON no válido:<br>${e.message}
      <br><span style="font-size:1em;font-weight:400;">
        (Línea <b>${line}</b>, columna <b>${column}</b>)
      </span>
    </div>`;
    flashMsg('JSON no válido para árbol', "#e54d4d");
  }
  show('tree');
};

document.getElementById('tab-convert').onclick = () => show('convert');
document.getElementById('tab-favs').onclick = e => {
  if (!isPro) return showProPanel();
  showFavs();
  flashMsg('Mostrando favoritos', "#32ba7c");
};
// --- Guardar favorito (PRO) ---
favBtn.onclick = e => {
  if (!isPro) return showProPanel();
  if (!input.value.trim()) return;
  const name = prompt("Este favorito se guarda solo en tu navegador/Nombre para el favorito:");
  if (!name) return;
  favs.push({ name, json: input.value });
  localStorage.setItem('favs', JSON.stringify(favs));
  flashMsg('Favorito guardado', "#32ba7c");
};

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

shareBtn.onclick = () => {
  if (!navigator.share) return flashMsg('No soportado', "#e54d4d");
  navigator.share({
    title: "JSON Beautifier PRO",
    text: input.value,
    url: location.href
  });
  flashMsg('Compartido', "#32ba7c");
};

// --- CONVERSIÓN Y EXPORTACIONES ---
document.getElementById('btn-xml').onclick = () => {
  try {
    const json = JSON.parse(input.value);
    const xml = jsonToXml(json, 0);
    convertedOutput.textContent = xml;
    show('convert');
    flashMsg('Convertido a XML', "#32ba7c");
  } catch (e) {
    convertedOutput.textContent = "❌ Error: " + e.message;
    show('convert');
    flashMsg('Error al convertir', "#e54d4d");
  }
};
document.getElementById('btn-csv').onclick = () => {
  try {
    const json = JSON.parse(input.value);
    const csv = jsonToCSV(json);
    convertedOutput.textContent = csv;
    show('convert');
    flashMsg('Convertido a CSV', "#32ba7c");
  } catch (e) {
    convertedOutput.textContent = "❌ Error: " + e.message;
    show('convert');
    flashMsg('Error al convertir', "#e54d4d");
  }
};
document.getElementById('btn-yaml').onclick = () => {
  if (!isPro) return showProPanel();
  try {
    const json = JSON.parse(input.value);
    const yaml = jsonToYaml(json);
    convertedOutput.textContent = yaml;
    show('convert');
    flashMsg('Convertido a YAML', "#32ba7c");
  } catch (e) {
    convertedOutput.textContent = "❌ Error: " + e.message;
    show('convert');
    flashMsg('Error al convertir', "#e54d4d");
  }
};
document.getElementById('btn-excel').onclick = () => {
  if (!isPro) return showProPanel();
  try {
    const json = JSON.parse(input.value);
    const csv = jsonToCSV(json);
    const blob = new Blob([csv], {type: "text/csv"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "archivo.csv"; // ← aquí el cambio clave
    link.click();
    flashMsg('Descargado como CSV (Excel)', "#32ba7c");
  } catch (e) {
    flashMsg('Error al exportar Excel', "#e54d4d");
  }
};

document.getElementById('btn-download').onclick = () => {
  if (!isPro) return showProPanel();
  if (!input.value.trim()) return flashMsg('Nada para descargar', "#e54d4d");
  const blob = new Blob([input.value], { type: "application/json" });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = "archivo.json";
  link.click();
  flashMsg('JSON descargado', "#32ba7c");
};
document.getElementById('btn-pdf').onclick = async () => {
  if (!isPro) return showProPanel();

  let ctxMenu = document.getElementById('tree-menu-contextual');
  if (ctxMenu) ctxMenu.style.display = 'none';
  let toast = document.getElementById('toast');
  if (toast) {
    toast.classList.remove('show');
    toast.textContent = '';
  }
  let toastTree = document.getElementById('toast-tree-pro');
  if (toastTree) {
    toastTree.classList.remove('show-tree-pro');
    toastTree.textContent = '';
  }

  const tabFormatted = document.getElementById('tab-formatted');
  const tabTree = document.getElementById('tab-tree');
  const tabConvert = document.getElementById('tab-convert');
  let text = "";
  let filename = "archivo.pdf";

  if (tabFormatted.classList.contains('active')) {
    text = output.textContent || "";
    filename = "json_formateado.pdf";
  } else if (tabConvert.classList.contains('active')) {
    text = convertedOutput.textContent || "";
    filename = "convertido.pdf";
  } else if (tabTree.classList.contains('active')) {
    let jsonOk = true;
    let jsonObj;
    try {
      jsonObj = JSON.parse(input.value);
    } catch {
      jsonOk = false;
      text = "Árbol vacío o JSON inválido";
    }
    if (jsonOk) {
      text = jsonToAsciiTree(jsonObj);
      filename = "vista_arbol.pdf";
    }
    if (!text.trim()) text = "Árbol vacío o sin nodos";
  } else {
    flashMsg('Nada para exportar', "#e54d4d");
    return;
  }

  if (!text.trim()) {
    flashMsg('Nada para exportar', "#e54d4d");
    return;
  }

  // Cargar jsPDF si no está
  if (typeof window.jspdf === "undefined") {
    await new Promise(resolve => {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const left = 40;
  const top = 50;
  const width = 515;
  const fontSize = 11;
  doc.setFont("courier", "normal");
  doc.setFontSize(fontSize);

  let lines = doc.splitTextToSize(text, width);
  doc.text(lines, left, top);

  doc.save(filename);
  flashMsg('PDF exportado', "#32ba7c");
};

// --- Árbol ASCII para PDF ---
function jsonToAsciiTree(obj, indent = '', isLast = true) {
  let output = '';
  const pointer = isLast ? '`-- ' : '|-- ';
  if (Array.isArray(obj)) {
    output += indent + pointer + '[Array]\n';
    obj.forEach((item, i) => {
      const isLastItem = i === obj.length - 1;
      output += jsonToAsciiTree(item, indent + (isLast ? '    ' : '|   '), isLastItem);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    output += indent + pointer + '{Object}\n';
    const keys = Object.keys(obj);
    keys.forEach((k, idx) => {
      const isLastKey = idx === keys.length - 1;
      let value = obj[k];
      if (typeof value === 'object' && value !== null) {
        output += indent + (isLast ? '    ' : '|   ') + (isLastKey ? '`-- ' : '|-- ') + k + ':\n';
        output += jsonToAsciiTree(value, indent + (isLast ? '    ' : '|   ') + (isLastKey ? '    ' : '|   '), true);
      } else {
        output += indent + (isLast ? '    ' : '|   ') + (isLastKey ? '`-- ' : '|-- ') + k + ': ' + String(value) + '\n';
      }
    });
  } else {
    output += indent + pointer + String(obj) + '\n';
  }
  return output;
}

// --- Conversores simples a XML, CSV, YAML (para ejemplo) ---
function jsonToXml(obj, indent) {
  let xml = '';
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    obj.forEach(item => xml += jsonToXml(item, indent));
  } else if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      xml += `${pad}<${key}>${jsonToXml(obj[key], indent + 1)}</${key}>\n`;
    }
  } else {
    xml += obj;
  }
  return xml;
}
function jsonToCSV(obj) {
  if (!Array.isArray(obj)) obj = [obj];
  const keys = Object.keys(obj[0] || {});
  const rows = obj.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","));
  return keys.join(",") + "\n" + rows.join("\n");
}
function jsonToYaml(obj, indent = 0) {
  let yaml = '';
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      yaml += pad + "- " + jsonToYaml(item, indent + 1).trim() + "\n";
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      yaml += pad + key + ": " + jsonToYaml(obj[key], indent + 1).trim() + "\n";
    }
  } else {
    yaml += String(obj);
  }
  return yaml;
}

// --- Toast siempre funcional ---
function flashMsg(msg, color = "#32ba7c", time = 1800) {
  let toast = document.getElementById('toast');
  if (!toast) return;
  toast.classList.remove('show');
  toast.style.background = color.startsWith('#')
    ? color
    : "linear-gradient(90deg, #32ba7c 80%, #3e89fa 100%)";
  toast.textContent = msg;
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(flashMsg.timeout);
  flashMsg.timeout = setTimeout(() => {
    toast.classList.remove('show');
    toast.textContent = '';
  }, time);
}
// --- Árbol PRO AVANZADO (búsqueda, copiar, exportar rama, colores PRO) ---
function drawTreePro(json) {
  const container = document.getElementById('tree-output');
  if (!container) return;
  container.innerHTML = '';

  // --- BÚSQUEDA INSTANTÁNEA ---
  let searchBar = document.getElementById('tree-search-pro');
  if (!searchBar) {
    searchBar = document.createElement('input');
    searchBar.type = "search";
    searchBar.id = "tree-search-pro";
    searchBar.placeholder = "🔍 Buscar clave o valor...";
    searchBar.style = "width:98%;margin:0.5em auto 1.1em auto;display:block;font-size:1.1em;border-radius:0.5em;padding:0.25em 1em;";
    container.appendChild(searchBar);
  }
  // Zona árbol real
  let treeArea = document.createElement('div');
  treeArea.id = 'tree-area-pro';
  container.appendChild(treeArea);

  // Menú contextual único para el árbol
  let ctxMenu = document.getElementById('tree-menu-contextual');
  if (!ctxMenu) {
    ctxMenu = document.createElement('div');
    ctxMenu.id = "tree-menu-contextual";
    ctxMenu.className = "tree-menu-contextual";
    ctxMenu.style.display = "none";
    ctxMenu.innerHTML = `
      <button class="ctx-copy-key">Copiar clave</button>
      <button class="ctx-copy-value">Copiar valor</button>
      <button class="ctx-copy-branch">Copiar rama</button>
      <button class="ctx-export-branch">Exportar rama</button>
    `;
    document.body.appendChild(ctxMenu);

    // LISTENERS SOLO AQUÍ
    ctxMenu.querySelector('.ctx-copy-key').onclick = e => {
      e.stopPropagation();
      if (typeof ctxMenu.currentKey !== "undefined") {
        navigator.clipboard.writeText(ctxMenu.currentKey);
        flashMsg('Clave copiada', "#32ba7c");
      }
      hideCtxMenu();
    };
    ctxMenu.querySelector('.ctx-copy-value').onclick = e => {
      e.stopPropagation();
      navigator.clipboard.writeText(JSON.stringify(ctxMenu.currentValue));
      flashMsg('Valor copiado', "#32ba7c");
      hideCtxMenu();
    };
    ctxMenu.querySelector('.ctx-copy-branch').onclick = e => {
      e.stopPropagation();
      navigator.clipboard.writeText(JSON.stringify(ctxMenu.currentValue, null, 2));
      flashMsg('Rama copiada', "#32ba7c");
      hideCtxMenu();
    };
    ctxMenu.querySelector('.ctx-export-branch').onclick = e => {
      e.stopPropagation();
      const convertedOutput = document.getElementById('converted-output');
      convertedOutput.textContent = JSON.stringify(ctxMenu.currentValue, null, 2);
      show('convert');
      flashMsg('Rama exportada a panel', "#3e89fa");
      hideCtxMenu();
    };
  }

  // Oculta menú contextual
  function hideCtxMenu() { ctxMenu.style.display = "none"; }
  window.addEventListener('click', hideCtxMenu);

  function createNode(key, value, parentType, depth = 0) {
    const node = document.createElement('div');
    node.className = 'tree-node-pro';

    if (typeof value === "object" && value !== null) {
      const isArray = Array.isArray(value);
      const branch = document.createElement('div');
      branch.className = 'branch-header-pro';

      const expander = document.createElement('span');
      expander.className = 'expander-pro';
      expander.textContent = '▼';
      branch.appendChild(expander);

      if (parentType !== 'array') {
        const keyEl = document.createElement('span');
        keyEl.className = 'tree-key-pro';
        keyEl.textContent = key;
        branch.appendChild(keyEl);
        keyEl.ondblclick = e => {
          e.stopPropagation();
          navigator.clipboard.writeText(key);
          flashMsg('Clave copiada', "#32ba7c");
        };
      }

      const typeEl = document.createElement('span');
      typeEl.className = 'tree-type-pro';
      typeEl.textContent = isArray ? `[${value.length}]` : '{ }';
      branch.appendChild(typeEl);

      const menuBtn = document.createElement('button');
      menuBtn.className = 'menu-btn-pro';
      menuBtn.title = 'Más acciones';
      menuBtn.innerHTML = '⋮';
      branch.appendChild(menuBtn);

      menuBtn.onclick = e => {
        e.stopPropagation();
        showCtxMenu(e, key, value, node, true);
      };

      branch.onclick = e => {
        e.stopPropagation();
        document.querySelectorAll('.branch-header-pro.selected-pro').forEach(el => el.classList.remove('selected-pro'));
        branch.classList.add('selected-pro');
      };

      node.appendChild(branch);

      const children = document.createElement('div');
      children.className = 'tree-children-pro';

      if (isArray) {
        value.forEach((v, i) => {
          children.appendChild(createNode(i, v, 'array', depth + 1));
        });
      } else {
        Object.entries(value).forEach(([k, v]) => {
          children.appendChild(createNode(k, v, 'object', depth + 1));
        });
      }
      node.appendChild(children);

      expander.onclick = e => {
        e.stopPropagation();
        const collapsed = children.classList.toggle('collapsed-pro');
        expander.textContent = collapsed ? '▶' : '▼';
      };
    } else {
      const leaf = document.createElement('div');
      leaf.className = 'tree-leaf-pro';
      if (parentType !== 'array') {
        const keyEl = document.createElement('span');
        keyEl.className = 'tree-key-pro';
        keyEl.textContent = key;
        leaf.appendChild(keyEl);
        keyEl.ondblclick = e => {
          e.stopPropagation();
          navigator.clipboard.writeText(key);
          flashMsg('Clave copiada', "#32ba7c");
        };
      }
      const valEl = document.createElement('span');
      valEl.className = 'tree-value-pro';

      if (typeof value === 'string') {
        valEl.classList.add('tree-str-pro');
        valEl.textContent = `"${value}"`;
        valEl.style.color = "#4ecb61";
      } else if (typeof value === 'number') {
        valEl.classList.add('tree-num-pro');
        valEl.textContent = value;
        valEl.style.color = "#32a4ed";
      } else if (typeof value === 'boolean') {
        valEl.classList.add('tree-bool-pro');
        valEl.textContent = value ? 'true' : 'false';
        valEl.style.color = "#eaa800";
      } else if (value === null) {
        valEl.classList.add('tree-null-pro');
        valEl.textContent = 'null';
        valEl.style.color = "#e24d4d";
      } else {
        valEl.textContent = String(value);
      }
      leaf.appendChild(valEl);

      valEl.ondblclick = e => {
        e.stopPropagation();
        navigator.clipboard.writeText(value === null ? "null" : value.toString());
        flashMsg('Valor copiado', "#32ba7c");
      };

      const menuBtn = document.createElement('button');
      menuBtn.className = 'menu-btn-pro';
      menuBtn.title = 'Más acciones';
      menuBtn.innerHTML = '⋮';
      leaf.appendChild(menuBtn);

      menuBtn.onclick = e => {
        e.stopPropagation();
        showCtxMenu(e, key, value, leaf, false);
      };

      leaf.onclick = e => {
        e.stopPropagation();
        document.querySelectorAll('.tree-leaf-pro.selected-pro').forEach(el => el.classList.remove('selected-pro'));
        leaf.classList.add('selected-pro');
      };

      node.appendChild(leaf);
    }
    return node;
  }

  function showCtxMenu(e, key, value, node, isBranch) {
    ctxMenu.style.display = "flex";
    ctxMenu.style.top = e.clientY + "px";
    ctxMenu.style.left = e.clientX + "px";
    ctxMenu.currentKey = key;
    ctxMenu.currentValue = value;
    ctxMenu.currentNode = node;
    ctxMenu.currentIsBranch = isBranch;
    setTimeout(() => {
      ctxMenu.focus && ctxMenu.focus();
    }, 50);
    e.preventDefault();
  }

  searchBar.oninput = function() {
    const q = this.value.trim().toLowerCase();
    treeArea.querySelectorAll('.tree-key-pro, .tree-value-pro').forEach(el => {
      el.style.background = '';
      el.style.fontWeight = '';
    });
    if (q) {
      treeArea.querySelectorAll('.tree-key-pro, .tree-value-pro').forEach(el => {
        if (el.textContent.toLowerCase().includes(q)) {
          el.style.background = '#e0f0fc';
          el.style.fontWeight = 'bold';
        }
      });
    }
  };

  let root;
  if (Array.isArray(json)) {
    root = createNode('(array)', json, 'root');
  } else if (typeof json === "object" && json !== null) {
    root = createNode('(objeto)', json, 'root');
  } else {
    root = createNode('valor', json, 'root');
  }
  treeArea.appendChild(root);
}
