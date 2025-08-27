// Versión limpia única
class DictafonoApp {
    constructor() {
        this.recognition=null;this.isListening=false;this.silenceTimer=null;this.lastResultIndex=0;this.manualStop=false;this.nextWordShouldCapitalize=false;this.autoCommaEnabled=true;this.currentLangIndex=0;this.spanishLanguages=['es-ES','es-US','es-MX','es-AR','es-CO'];
        this.initElements();
        this.initSpeechRecognition();
        this.bindEvents();
        // Restaurar borrador ANTES de primer updateWordCount para no sobrescribirlo con vacío
        this.restoreDraft();
        this.updateWordCount();
        this.focusTextArea();
        // Salvaguardas extra de persistencia
        window.addEventListener('beforeunload',()=>this.saveDraft());
        document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden') this.saveDraft();});
    }
    initElements(){this.playBtn=document.getElementById('playBtn');this.stopBtn=document.getElementById('stopBtn');this.copyBtn=document.getElementById('copyBtn');this.clearBtn=document.getElementById('clearBtn');this.archiveBtn=document.getElementById('archiveBtn');this.loadFileBtn=document.getElementById('loadFileBtn');this.languageToolBtn=document.getElementById('languageToolBtn');this.emojiBtn=document.getElementById('emojiBtn');this.themeBtn=document.getElementById('themeBtn');this.buttonThemeBtn=document.getElementById('buttonThemeBtn');this.fontStyleBtn=document.getElementById('fontStyleBtn');this.textOutput=document.getElementById('textOutput');this.statusText=document.getElementById('statusText');this.statusIcon=document.getElementById('statusIcon');this.wordCount=document.getElementById('wordCount');this.toast=document.getElementById('toast');this.db=null;this.fontPanel=null;this.initThemes();this.initButtonThemes();this.initFontStyles();}

    initFontStyles(){
        // Configuración por defecto (añadimos cursiva y negrita)
        const defaults={family:"'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", size:'1.04', color:'#ffffff', lineHeight:'1.58', italic:false, bold:false};
        const savedRaw=localStorage.getItem('dictafono.fontStyle');
        let saved={};
        try{ if(savedRaw) saved=JSON.parse(savedRaw)||{}; }catch(e){ saved={}; }
        this.fontStyle={...defaults,...saved};
        this.applyFontStyle(false);
    }
    applyFontStyle(notify=true){
        const root=document.documentElement;
        root.style.setProperty('--editor-font-family',this.fontStyle.family);
        root.style.setProperty('--editor-font-size',this.fontStyle.size+'rem');
        root.style.setProperty('--editor-font-color',this.fontStyle.color);
        root.style.setProperty('--editor-line-height',this.fontStyle.lineHeight);
        root.style.setProperty('--editor-font-style',this.fontStyle.italic?'italic':'normal');
        root.style.setProperty('--editor-font-weight',this.fontStyle.bold?'600':'400');
        localStorage.setItem('dictafono.fontStyle',JSON.stringify(this.fontStyle));
        if(this.fontStyleBtn){this.fontStyleBtn.setAttribute('data-tip',`Texto: ${this.fontStyle.size}rem`);} 
        if(notify) this.showToast('Estilo de texto actualizado','success',1400);
    }
    openFontPanel(){
        if(this.fontPanel){this.closeFontPanel();return;}
        if(!this.fontStyleBtn)return;
        const panel=document.createElement('div');
        panel.className='font-style-panel';
        const families=[
            {name:'Sistema',value:"'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"},
            {name:'Serif',value:"'Georgia', serif"},
            {name:'Mono',value:"'Courier New', monospace"},
            {name:'Open Sans',value:"'Open Sans', 'Segoe UI', sans-serif"},
            {name:'Roboto',value:"'Roboto', 'Segoe UI', sans-serif"}
        ];
        const sizeVal=parseFloat(this.fontStyle.size)||1.04;
          const html=`<div class="font-style-group">
            <label>Fuente
                <select id="fsFamily">${families.map(f=>`<option value="${f.value.replace(/"/g,'&quot;')}" ${this.fontStyle.family===f.value?'selected':''}>${f.name}</option>`).join('')}</select>
            </label>
            <label>Tamaño (rem)
                <input id="fsSize" type="number" step="0.02" min="0.6" max="3" value="${sizeVal}">
            </label>
            <label>Color
                <input id="fsColor" type="color" value="${this.fontStyle.color}">
            </label>
            <label>Interlineado
                <input id="fsLine" type="number" step="0.05" min="1" max="2.6" value="${parseFloat(this.fontStyle.lineHeight||'1.58')}">
            </label>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <label style="flex:1;display:flex;gap:6px;align-items:center;justify-content:flex-start;font-weight:500;font-size:.68rem;">
                        <input id="fsItalic" type="checkbox" ${this.fontStyle.italic?'checked':''} style="scale:1.1;"> Cursiva
                    </label>
                    <label style="flex:1;display:flex;gap:6px;align-items:center;justify-content:flex-start;font-weight:500;font-size:.68rem;">
                        <input id="fsBold" type="checkbox" ${this.fontStyle.bold?'checked':''} style="scale:1.1;"> Negrita
                    </label>
                </div>
            <div class="font-preview-box" id="fsPreview">Vista previa de texto</div>
            <div class="font-style-actions">
                <button id="fsReset">Restablecer</button>
                <button id="fsApply">Aplicar</button>
            </div>
        </div>`;
        panel.innerHTML=html;
        document.body.appendChild(panel);
        this.fontPanel=panel;
        this.positionFontPanel();
        const familySel=panel.querySelector('#fsFamily');
        const sizeInp=panel.querySelector('#fsSize');
        const colorInp=panel.querySelector('#fsColor');
        const lineInp=panel.querySelector('#fsLine');
        const italicChk=panel.querySelector('#fsItalic');
        const boldChk=panel.querySelector('#fsBold');
        const preview=panel.querySelector('#fsPreview');
        const updatePreview=()=>{
            preview.style.fontFamily=familySel.value;
            preview.style.fontSize=sizeInp.value+'rem';
            preview.style.lineHeight=lineInp.value;
            preview.style.color=colorInp.value;
            preview.style.fontStyle=italicChk.checked?'italic':'normal';
            preview.style.fontWeight=boldChk.checked?'600':'400';
        };
        updatePreview();
        familySel.addEventListener('input',updatePreview);
        sizeInp.addEventListener('input',updatePreview);
        colorInp.addEventListener('input',updatePreview);
        lineInp.addEventListener('input',updatePreview);
        italicChk.addEventListener('change',updatePreview);
        boldChk.addEventListener('change',updatePreview);
        panel.querySelector('#fsApply').addEventListener('click',()=>{
            this.fontStyle={family:familySel.value,size:parseFloat(sizeInp.value).toFixed(2),color:colorInp.value,lineHeight:lineInp.value,italic:italicChk.checked,bold:boldChk.checked};
            this.applyFontStyle();
            this.closeFontPanel();
        });
        panel.querySelector('#fsReset').addEventListener('click',()=>{
            this.fontStyle={family:"'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",size:'1.04',color:'#ffffff',lineHeight:'1.58',italic:false,bold:false};this.applyFontStyle();italicChk.checked=false;boldChk.checked=false;familySel.value=this.fontStyle.family;sizeInp.value=this.fontStyle.size;colorInp.value=this.fontStyle.color;lineInp.value=this.fontStyle.lineHeight;updatePreview();
        });
        const esc=(e)=>{if(e.key==='Escape'){this.closeFontPanel();document.removeEventListener('keydown',esc);}};document.addEventListener('keydown',esc);
        setTimeout(()=>{document.addEventListener('click',this._outsideFontClick=(ev)=>{if(this.fontPanel && !this.fontPanel.contains(ev.target) && ev.target!==this.fontStyleBtn){this.closeFontPanel();}});},0);
    }
    closeFontPanel(){ if(this.fontPanel){this.fontPanel.remove();this.fontPanel=null;document.removeEventListener('click',this._outsideFontClick);} }
    positionFontPanel(){ if(!this.fontPanel||!this.fontStyleBtn)return; const r=this.fontStyleBtn.getBoundingClientRect(); const top=r.bottom+8+window.scrollY; let left=r.left+window.scrollX - 80; if(left<8)left=8; if(left+320>window.innerWidth-8) left=window.innerWidth-328; this.fontPanel.style.top=top+'px'; this.fontPanel.style.left=left+'px'; }
    initThemes(){
        this.themes=[
            {id:'carbon',name:'Carbon',props:{'--bg-root':'linear-gradient(135deg,#0f0f0f,#191919)','--panel-gradient':'linear-gradient(145deg,#202020,#161616)','--accent1':'#4caf50','--accent2':'#2196f3','--text-primary':'#e0e0e0','--text-secondary':'#b5b5b5'}},
            {id:'dracula',name:'Drácula',props:{'--bg-root':'linear-gradient(135deg,#282a36,#1e1f29)','--panel-gradient':'linear-gradient(145deg,#343746,#242530)','--accent1':'#bd93f9','--accent2':'#ff79c6','--text-primary':'#d6ccff','--text-secondary':'#b9b0d6'}},
            {id:'amethyst',name:'Amethyst',props:{'--bg-root':'linear-gradient(135deg,#1f1633,#2a1f47)','--panel-gradient':'linear-gradient(145deg,#332654,#221a3b)','--accent1':'#a855f7','--accent2':'#ec4899','--text-primary':'#e7d9ff','--text-secondary':'#bda6e6'}},
            {id:'violetstorm',name:'Violet Storm',props:{'--bg-root':'linear-gradient(135deg,#1b1d3a,#251c52)','--panel-gradient':'linear-gradient(145deg,#2e2f57,#1f1f3f)','--accent1':'#7c3aed','--accent2':'#6366f1','--text-primary':'#dad6ff','--text-secondary':'#b3b0e6'}},
            {id:'midnight',name:'Midnight',props:{'--bg-root':'linear-gradient(135deg,#141E30,#0f1115)','--panel-gradient':'linear-gradient(145deg,#1f2d42,#18212e)','--accent1':'#1abc9c','--accent2':'#2980b9','--text-primary':'#e8f1f5','--text-secondary':'#b3c0c7'}},
            {id:'matrix',name:'Matrix',props:{'--bg-root':'linear-gradient(135deg,#020b02,#061d06)','--panel-gradient':'linear-gradient(145deg,#0d2a0d,#051805)','--accent1':'#15ff6b','--accent2':'#0affc6','--text-primary':'#d9ffe6','--text-secondary':'#93c9a7'}},
            {id:'aurora',name:'Aurora',props:{'--bg-root':'linear-gradient(135deg,#111827,#0d131d)','--panel-gradient':'linear-gradient(145deg,#1f2937,#151d29)','--accent1':'#60a5fa','--accent2':'#34d399','--text-primary':'#f1f5f9','--text-secondary':'#cbd5e1'}}
        ];
        const saved=localStorage.getItem('dictafono.theme');
        this.currentThemeIndex = Math.max(0,this.themes.findIndex(t=>t.id===saved));
        if(this.currentThemeIndex===-1) this.currentThemeIndex=0;
        this.applyTheme(this.currentThemeIndex,false);
        this.themePanel=null;
    }
    initButtonThemes(){
        this.buttonThemes=[
            {id:'mono-dark',name:'Mono Dark',btn:{'--btn-bg':'#202326','--btn-bg-hover':'#2b3035','--btn-bg-active':'#181b1e','--btn-ring':'#4caf50'}},
            {id:'emerald',name:'Emerald',btn:{'--btn-bg':'linear-gradient(135deg,#064e3b,#065f46)','--btn-bg-hover':'linear-gradient(135deg,#065f46,#047857)','--btn-bg-active':'#064e3b','--btn-ring':'#10b981'}},
            {id:'violet',name:'Violet',btn:{'--btn-bg':'linear-gradient(135deg,#4c1d95,#5b21b6)','--btn-bg-hover':'linear-gradient(135deg,#5b21b6,#6d28d9)','--btn-bg-active':'#4c1d95','--btn-ring':'#a855f7'}},
            {id:'indigo',name:'Indigo',btn:{'--btn-bg':'linear-gradient(135deg,#1e3a8a,#1e40af)','--btn-bg-hover':'linear-gradient(135deg,#1e40af,#1d4ed8)','--btn-bg-active':'#1e3a8a','--btn-ring':'#3b82f6'}},
            {id:'sunset',name:'Sunset',btn:{'--btn-bg':'linear-gradient(135deg,#b91c1c,#c2410c)','--btn-bg-hover':'linear-gradient(135deg,#c2410c,#d97706)','--btn-bg-active':'#b91c1c','--btn-ring':'#f97316'}},
            {id:'cyber',name:'Cyber',btn:{'--btn-bg':'linear-gradient(135deg,#111827,#312e81)','--btn-bg-hover':'linear-gradient(135deg,#172135,#4338ca)','--btn-bg-active':'#111827','--btn-ring':'#06b6d4'}},
            {id:'slate',name:'Slate',btn:{'--btn-bg':'linear-gradient(135deg,#1e293b,#0f172a)','--btn-bg-hover':'linear-gradient(135deg,#334155,#1e293b)','--btn-bg-active':'#0f172a','--btn-ring':'#64748b'}}
        ];
        const saved=localStorage.getItem('dictafono.buttonTheme');
        this.currentButtonThemeIndex=Math.max(0,this.buttonThemes.findIndex(t=>t.id===saved));
        if(this.currentButtonThemeIndex===-1)this.currentButtonThemeIndex=0;
        this.applyButtonTheme(this.currentButtonThemeIndex,false);
        this.buttonThemePanel=null;
    }
    applyButtonTheme(index,notify=true){
        const th=this.buttonThemes[index]; if(!th) return; const root=document.documentElement; Object.entries(th.btn).forEach(([k,v])=>root.style.setProperty(k,v)); localStorage.setItem('dictafono.buttonTheme',th.id); if(this.buttonThemeBtn){this.buttonThemeBtn.setAttribute('data-tip','Botones: '+th.name);} if(notify) this.showToast('Botones: '+th.name,'success',1400);}
    openButtonThemePanel(){ if(this.buttonThemePanel){this.closeButtonThemePanel();return;} if(!this.buttonThemeBtn)return; const panel=document.createElement('div'); panel.className='theme-panel button-theme-panel'; panel.innerHTML=this.buttonThemes.map((t,i)=>{const active=i===this.currentButtonThemeIndex;return `<button class="theme-item ${active?'active':''}" data-btntheme="${t.id}" role="option" aria-selected="${active}"><span class="swatch" style="--c1:${t.btn['--btn-ring']};--c2:${t.btn['--btn-bg-hover']||t.btn['--btn-bg']};"></span><span>${t.name}</span></button>`;}).join(''); document.body.appendChild(panel); this.buttonThemePanel=panel; this.positionButtonThemePanel(); panel.addEventListener('click',e=>{const b=e.target.closest('.theme-item'); if(!b)return; const id=b.getAttribute('data-btntheme'); const idx=this.buttonThemes.findIndex(x=>x.id===id); if(idx>-1){this.currentButtonThemeIndex=idx; this.applyButtonTheme(idx);} this.closeButtonThemePanel();}); const esc=(e)=>{if(e.key==='Escape'){this.closeButtonThemePanel();document.removeEventListener('keydown',esc);}}; document.addEventListener('keydown',esc); setTimeout(()=>{document.addEventListener('click',this._outsideBtnThemeClick=(ev)=>{if(this.buttonThemePanel && !this.buttonThemePanel.contains(ev.target) && ev.target!==this.buttonThemeBtn){this.closeButtonThemePanel();}});},0);} 
    closeButtonThemePanel(){ if(this.buttonThemePanel){this.buttonThemePanel.remove(); this.buttonThemePanel=null; document.removeEventListener('click',this._outsideBtnThemeClick);} }
    positionButtonThemePanel(){ if(!this.buttonThemePanel||!this.buttonThemeBtn)return; const r=this.buttonThemeBtn.getBoundingClientRect(); const top=r.bottom+8+window.scrollY; let left=r.left+window.scrollX - 40; if(left<8)left=8; if(left+260>window.innerWidth-8) left=window.innerWidth-268; this.buttonThemePanel.style.top=top+'px'; this.buttonThemePanel.style.left=left+'px'; }
    applyTheme(index,notify=true){
        const theme=this.themes[index]; if(!theme) return;
        const root=document.documentElement; Object.entries(theme.props).forEach(([k,v])=>root.style.setProperty(k,v));
        localStorage.setItem('dictafono.theme',theme.id);
        if(this.themeBtn){ this.themeBtn.textContent='🎨'; this.themeBtn.setAttribute('data-tip','Tema: '+theme.name); }
        if(notify) this.showToast('Tema: '+theme.name,'success',1600);
    }
    cycleTheme(){ this.currentThemeIndex = (this.currentThemeIndex+1)%this.themes.length; this.applyTheme(this.currentThemeIndex); }
    openThemePanel(){
        if(this.themePanel){this.closeThemePanel();return;}
        if(!this.themeBtn) return;
        const panel=document.createElement('div');
        panel.className='theme-panel';
        panel.setAttribute('role','listbox');
        panel.innerHTML=this.themes.map((t,i)=>{
            const active=i===this.currentThemeIndex;
            return `<button class="theme-item ${active?'active':''}" data-theme="${t.id}" role="option" aria-selected="${active}">
                <span class="swatch" style="--c1:${t.props['--accent1']};--c2:${t.props['--accent2']};"></span>
                <span class="t-name">${t.name}</span>
            </button>`;
        }).join('');
        document.body.appendChild(panel);
        this.themePanel=panel;
        this.positionThemePanel();
        panel.addEventListener('click',e=>{
            const btn=e.target.closest('.theme-item');
            if(!btn)return;
            const id=btn.getAttribute('data-theme');
            const idx=this.themes.findIndex(t=>t.id===id);
            if(idx>-1){this.currentThemeIndex=idx;this.applyTheme(idx);}
            this.closeThemePanel();
        });
        const escHandler=(e)=>{if(e.key==='Escape'){this.closeThemePanel();document.removeEventListener('keydown',escHandler);}};
        document.addEventListener('keydown',escHandler);
        setTimeout(()=>{document.addEventListener('click',this._outsideThemeClick=(ev)=>{if(this.themePanel && !this.themePanel.contains(ev.target) && ev.target!==this.themeBtn){this.closeThemePanel();}});},0);
    }
    closeThemePanel(){ if(this.themePanel){this.themePanel.remove(); this.themePanel=null; document.removeEventListener('click',this._outsideThemeClick); } }
    positionThemePanel(){ if(!this.themePanel||!this.themeBtn)return; const r=this.themeBtn.getBoundingClientRect(); const top=r.bottom+8+window.scrollY; let left=r.left+window.scrollX - 40; if(left<8)left=8; if(left+260>window.innerWidth-8) left=window.innerWidth-268; this.themePanel.style.top=top+'px'; this.themePanel.style.left=left+'px'; }
    initSpeechRecognition(){
        // Web Speech API
        if('webkitSpeechRecognition' in window){this.recognition=new webkitSpeechRecognition();this.recognitionMode='web';}
        else if('SpeechRecognition' in window){this.recognition=new SpeechRecognition();this.recognitionMode='web';}
        // Cordova plugin fallback
        else if(window.cordova && window.plugins && window.plugins.speechRecognition){
            this.recognitionMode='plugin';
            this.speechPlugin=window.plugins.speechRecognition;
            try{this.speechPlugin.requestPermission(()=>{},()=>{});}catch(_e){}
        } else {
            this.showToast('Reconocimiento no soportado','error');
            this.recognitionMode='none';
            return;
        }
        if(this.recognitionMode==='web'){
            this.recognition.continuous=false;this.recognition.interimResults=true;this.recognition.lang=this.spanishLanguages[this.currentLangIndex];this.recognition.maxAlternatives=1;
            this.recognition.onstart=()=>{this.isListening=true;this.lastResultIndex=0;this.updateStatus('Escuchando...','🎧');this.playBtn.disabled=true;this.stopBtn.disabled=false;this.resetSilenceTimer();};
            this.recognition.onspeechstart=()=>this.clearSilenceTimer();
            this.recognition.onspeechend=()=>this.resetSilenceTimer();
            this.recognition.onsoundstart=()=>this.clearSilenceTimer();
            this.recognition.onsoundend=()=>this.resetSilenceTimer();
            this.recognition.onresult=(event)=>{const startIndex=this.lastResultIndex||0;for(let i=startIndex;i<event.results.length;i++){if(event.results[i]&&event.results[i][0]){const transcript=event.results[i][0].transcript;if(event.results[i].isFinal){const textWithSpace=this.ensureProperSpacing(transcript.trim());this.insertTextAtCursor(textWithSpace);this.lastResultIndex=i+1;this.updateWordCount();} else {this.showInterimPreview(transcript);}}}};
            this.recognition.onerror=(event)=>{let msg='Error en el reconocimiento';switch(event.error){case 'no-speech':msg='No se detectó voz.';break;case 'audio-capture':msg='Sin micrófono.';break;case 'not-allowed':msg='Permiso denegado.';break;case 'network':msg='Error de red.';break;}this.showToast(msg,'error');this.stopListening();};
            this.recognition.onend=()=>{if(this.isListening&&!this.manualStop){setTimeout(()=>{if(this.isListening){try{this.recognition.start();}catch(e){this.stopListening();}}},120);} else {this.stopListening();}};
        }
    }
    bindEvents(){this.playBtn.addEventListener('click',()=>this.startListening());this.stopBtn.addEventListener('click',()=>this.stopListening());this.copyBtn.addEventListener('click',()=>this.copyToClipboard());this.clearBtn.addEventListener('click',()=>this.clearText());if(this.archiveBtn)this.archiveBtn.addEventListener('click',()=>this.openArchiveModal());if(this.loadFileBtn)this.loadFileBtn.addEventListener('click',()=>this.openLoadModal());if(this.languageToolBtn)this.languageToolBtn.addEventListener('click',()=>this.runLanguageToolAuto());if(this.emojiBtn)this.emojiBtn.addEventListener('click',()=>this.toggleEmojiPanel());if(this.themeBtn)this.themeBtn.addEventListener('click',()=>this.openThemePanel());if(this.buttonThemeBtn)this.buttonThemeBtn.addEventListener('click',()=>this.openButtonThemePanel());if(this.fontStyleBtn)this.fontStyleBtn.addEventListener('click',()=>this.openFontPanel());window.addEventListener('resize',()=>{this.positionThemePanel();this.positionButtonThemePanel();this.positionFontPanel();});this.textOutput.addEventListener('input',e=>{this.updateWordCount();this.handleManualInput(e);});this.textOutput.addEventListener('keyup',e=>{if(this.isListening)return;if(this.isPunctuationThatNeedsSpace(e.key))setTimeout(()=>this.addSpaceAfterPunctuation(e.key),5);if(e.key===' '){const pos=this.textOutput.selectionStart;const before=this.textOutput.value.substring(0,pos-1);if(before.endsWith('.'))this.nextWordShouldCapitalize=true;}if(this.nextWordShouldCapitalize&&/^[a-záéíóúñü]$/i.test(e.key)){this.nextWordShouldCapitalize=false;const pos=this.textOutput.selectionStart;const txt=this.textOutput.value;if(pos>0){const before=txt.substring(0,pos-1);const after=txt.substring(pos);const cap=e.key.toUpperCase();this.textOutput.value=before+cap+after;this.textOutput.setSelectionRange(pos,pos);}}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){this.closeEmojiPanel();this.closeThemePanel();this.closeButtonThemePanel();this.closeFontPanel();}});document.addEventListener('click',e=>{if(this.emojiPanel && !this.emojiPanel.contains(e.target) && e.target!==this.emojiBtn){this.closeEmojiPanel();}});this.initArchiveDB();}
    initArchiveDB(){const req=indexedDB.open('archivos_guardados_db',1);req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains('archivos')){db.createObjectStore('archivos',{keyPath:'id'});}};req.onsuccess=e=>{this.db=e.target.result;};req.onerror=()=>{this.showToast('IndexedDB no disponible','error');};}
    openArchiveModal(){const text=this.textOutput.value;if(!text.trim()){this.showToast('No hay texto','error');return;}const modal=this.buildSimpleModal('Archivar texto',`<label style="display:flex;flex-direction:column;gap:6px;font-size:.85rem;">Nombre de archivo<input id="archiveFileName" type="text" placeholder="ej: nota-reunion" style="padding:8px 10px;border-radius:8px;border:1px solid #444;background:#222;color:#fff;"/></label>`,'📦 Archivar','Cancelar');document.body.appendChild(modal.overlay);const input=modal.overlay.querySelector('#archiveFileName');input.focus();modal.acceptBtn.addEventListener('click',()=>{const base=(input.value||'sin-nombre').trim().replace(/[^a-z0-9-_]/gi,'_');const fileName=base||'sin_nombre';this.saveToIndexedDB(fileName,text);modal.close();});}
    openLoadModal(){if(!this.db){this.showToast('DB no lista','error');return;}const tx=this.db.transaction('archivos','readonly');const store=tx.objectStore('archivos');const req=store.getAll();req.onsuccess=()=>{const files=req.result.sort((a,b)=>b.timestamp-a.timestamp);if(!files.length){this.showToast('Sin archivos','error');return;}const list=files.map(f=>`<li data-id="${f.id}" class="file-entry"> <span class="file-name">${this.escapeHtml(f.id)}</span><div class="file-meta"><span class="file-date">${new Date(f.timestamp).toLocaleString()}</span><button class="mini-btn delete-file" title="Eliminar" aria-label="Eliminar">🗑️</button></div></li>`).join('');const modal=this.buildSimpleModal('Cargar archivo',`<ul id="loadFileList" class="file-list">${list}</ul>`,'Cerrar','Cancelar',true);document.body.appendChild(modal.overlay);const ul=modal.overlay.querySelector('#loadFileList');ul.addEventListener('click',ev=>{const delBtn=ev.target.closest('.delete-file');if(delBtn){ev.stopPropagation();const li=delBtn.closest('li[data-id]');if(!li)return;const id=li.dataset.id;if(!confirm(`Eliminar archivo "${id}"?`))return;this.deleteFromIndexedDB(id,()=>{li.remove();this.showToast('Archivo eliminado','success');if(!ul.querySelector('li')){modal.close();}});return;}const li=ev.target.closest('li[data-id]');if(!li)return;const id=li.dataset.id;this.loadFromIndexedDB(id,(content)=>{this.textOutput.value=content;this.updateWordCount();this.setCursorToEnd();this.showToast('Archivo cargado','success');modal.close();});});modal.acceptBtn.addEventListener('click',()=>modal.close());};req.onerror=()=>this.showToast('Error leyendo DB','error');}
    deleteFromIndexedDB(id,cb){if(!this.db){this.showToast('DB no lista','error');return;}const tx=this.db.transaction('archivos','readwrite');const store=tx.objectStore('archivos');const req=store.delete(id);req.onsuccess=()=>{if(cb)cb();};req.onerror=()=>this.showToast('Error al eliminar','error');}
    buildSimpleModal(title,innerHtml,acceptLabel='Aceptar',cancelLabel='Cancelar',singleButton=false){const overlay=document.createElement('div');overlay.className='spell-check-overlay';const html=`<div class="spell-check-modal"><div class="spell-check-header"><h3>${title}</h3><p>${singleButton?'Seleccione un elemento':'Ingrese un nombre'}</p></div><div class="spell-check-content" style="display:flex;flex-direction:column;gap:14px;">${innerHtml}</div><div class="spell-check-actions">${singleButton?`<button class="control-btn secondary" id="modalAcceptBtn">${acceptLabel}</button>`:`<button class="control-btn success" id="modalAcceptBtn">${acceptLabel}</button><button class="control-btn danger" id="modalCancelBtn">${cancelLabel}</button>`}</div></div>`;overlay.innerHTML=html;const acceptBtn=overlay.querySelector('#modalAcceptBtn');const cancelBtn=overlay.querySelector('#modalCancelBtn');const close=()=>overlay.remove();if(cancelBtn)cancelBtn.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close();});document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);}});return{overlay,acceptBtn,cancelBtn,close};}
    saveToIndexedDB(id,content){if(!this.db){this.showToast('DB no lista','error');return;}const tx=this.db.transaction('archivos','readwrite');const store=tx.objectStore('archivos');store.put({id,timestamp:Date.now(),content});tx.oncomplete=()=>this.showToast('Archivado','success');tx.onerror=()=>this.showToast('Error al archivar','error');}
    loadFromIndexedDB(id,cb){if(!this.db){this.showToast('DB no lista','error');return;}const tx=this.db.transaction('archivos','readonly');const store=tx.objectStore('archivos');const req=store.get(id);req.onsuccess=()=>{if(req.result)cb(req.result.content);else this.showToast('No encontrado','error');};req.onerror=()=>this.showToast('Error al cargar','error');}
    toggleEmojiPanel(){ if(this.emojiPanel){this.closeEmojiPanel();return;} this.openEmojiPanel(); }
    openEmojiPanel(){ const panel=document.createElement('div'); panel.className='emoji-panel'; panel.innerHTML=this.renderEmojiPanel(); document.body.appendChild(panel); this.emojiPanel=panel; this.emojiSearch=panel.querySelector('.emoji-search'); this.emojiGrid=panel.querySelector('.emoji-grid'); this.activeCategory='caras'; this.emojiData=this.getEmojiData(); this.filteredEmojis=this.emojiData; this.populateEmojis(); this.wireEmojiPanel(); this.positionEmojiPanel(); }
    closeEmojiPanel(){ if(this.emojiPanel){this.emojiPanel.remove(); this.emojiPanel=null; this.emojiSearch=null; this.emojiGrid=null;}}
    positionEmojiPanel(){ if(!this.emojiPanel||!this.emojiBtn)return; const rect=this.emojiBtn.getBoundingClientRect(); const top=rect.top+window.scrollY; const left=rect.right+12; this.emojiPanel.style.top= top+'px'; this.emojiPanel.style.left= left+'px'; }
    renderEmojiPanel(){ return `
        <div class="emoji-panel-header">
            <div class="emoji-category-tabs">
                <button class="emoji-tab" data-cat="caras">😀</button>
                <button class="emoji-tab" data-cat="gestos">👍</button>
                <button class="emoji-tab" data-cat="amor">❤️</button>
                <button class="emoji-tab" data-cat="animales">🐾</button>
                <button class="emoji-tab" data-cat="objetos">⚙️</button>
                <button class="emoji-tab" data-cat="naturaleza">🌿</button>
                <button class="emoji-tab" data-cat="comida">🍔</button>
                <button class="emoji-tab" data-cat="transporte">🚗</button>
                <button class="emoji-tab" data-cat="deporte">⚽</button>
                <button class="emoji-tab" data-cat="simbolos">⭐</button>
            </div>
            <button class="emoji-close-btn" title="Cerrar">✕</button>
        </div>
        <input type="text" class="emoji-search" placeholder="Buscar..." aria-label="Buscar emoji" />
        <div class="emoji-grid" role="listbox" aria-label="Lista de emojis"></div>
        <div class="emoji-panel-footer">Arrastra, toca o haz clic para insertar</div>`; }
    wireEmojiPanel(){ if(!this.emojiPanel)return; const tabs=[...this.emojiPanel.querySelectorAll('.emoji-tab')]; const closeBtn=this.emojiPanel.querySelector('.emoji-close-btn'); closeBtn.addEventListener('click',()=>this.closeEmojiPanel()); tabs.forEach(tab=>tab.addEventListener('click',()=>{tabs.forEach(t=>t.classList.remove('active'));tab.classList.add('active');this.activeCategory=tab.dataset.cat;this.applyEmojiFilters();})); tabs[0].classList.add('active'); this.emojiSearch.addEventListener('input',()=>this.applyEmojiFilters()); }
    getEmojiData(){ return [
        // Caras / emociones
        {e:'😀',k:'sonrisa cara feliz',c:'caras'},{e:'😁',k:'feliz sonrisa dientes',c:'caras'},{e:'😂',k:'risa carcajada lol',c:'caras'},{e:'🤣',k:'risa fuerte',c:'caras'},{e:'�',k:'nervioso alivio',c:'caras'},{e:'�😊',k:'feliz contento',c:'caras'},{e:'🙂',k:'neutral leve sonrisa',c:'caras'},{e:'😇',k:'angel santo',c:'caras'},{e:'😉',k:'guiño',c:'caras'},{e:'😍',k:'amor ojos corazon',c:'caras'},{e:'😘',k:'beso',c:'caras'},{e:'�',k:'beso leve',c:'caras'},{e:'�😜',k:'broma lengua',c:'caras'},{e:'�',k:'loco chiflado',c:'caras'},{e:'�🤔',k:'pensando duda',c:'caras'},{e:'🤨',k:'ceja levantada sospecha',c:'caras'},{e:'😎',k:'cool gafas',c:'caras'},{e:'🥶',k:'frio congelado',c:'caras'},{e:'🥵',k:'calor caloroso',c:'caras'},{e:'😢',k:'triste llanto',c:'caras'},{e:'😭',k:'llorar fuerte',c:'caras'},{e:'😡',k:'enojado enfado',c:'caras'},{e:'🤯',k:'sorprendido mente volada',c:'caras'},{e:'🥳',k:'fiesta celebrar',c:'caras'},{e:'😴',k:'dormido sueño',c:'caras'},
        // Gestos
        {e:'👍',k:'pulgar ok bien',c:'gestos'},{e:'👎',k:'pulgar abajo mal',c:'gestos'},{e:'👏',k:'aplauso bien hecho',c:'gestos'},{e:'🙌',k:'celebrar manos',c:'gestos'},{e:'🙏',k:'gracias por favor',c:'gestos'},{e:'🤝',k:'acuerdo trato',c:'gestos'},{e:'✍️',k:'escribir firma',c:'gestos'},{e:'💪',k:'fuerza gym',c:'gestos'},{e:'🫶',k:'manos corazon',c:'gestos'},{e:'👋',k:'hola adios saludo',c:'gestos'},
        // Amor
        {e:'❤️',k:'amor corazon rojo',c:'amor'},{e:'🧡',k:'amor naranja',c:'amor'},{e:'💛',k:'amor amarillo',c:'amor'},{e:'💚',k:'amor verde',c:'amor'},{e:'💙',k:'amor azul',c:'amor'},{e:'💜',k:'amor morado',c:'amor'},{e:'🤍',k:'corazon blanco',c:'amor'},{e:'🤎',k:'corazon marron',c:'amor'},{e:'🖤',k:'corazon negro',c:'amor'},{e:'💔',k:'corazon roto',c:'amor'},{e:'❣️',k:'exclamacion corazon',c:'amor'},{e:'💕',k:'corazones',c:'amor'},{e:'💞',k:'corazones girando',c:'amor'},{e:'💘',k:'corazon flecha',c:'amor'},{e:'💝',k:'corazon lazo regalo',c:'amor'},
        // Animales
        {e:'🐶',k:'perro dog',c:'animales'},{e:'🐱',k:'gato cat',c:'animales'},{e:'🐭',k:'raton',c:'animales'},{e:'🐹',k:'hamster',c:'animales'},{e:'🐰',k:'conejo',c:'animales'},{e:'🦊',k:'zorro',c:'animales'},{e:'🐻',k:'oso',c:'animales'},{e:'🐼',k:'panda',c:'animales'},{e:'🐨',k:'koala',c:'animales'},{e:'🐯',k:'tigre',c:'animales'},{e:'🦁',k:'leon',c:'animales'},{e:'🐮',k:'vaca',c:'animales'},{e:'🐷',k:'cerdo',c:'animales'},{e:'🐸',k:'rana',c:'animales'},{e:'🐵',k:'mono',c:'animales'},{e:'🦋',k:'mariposa',c:'animales'},{e:'🐝',k:'abeja',c:'animales'},
        // Objetos
        {e:'⚙️',k:'engranaje configuracion',c:'objetos'},{e:'🖊️',k:'boli escribir',c:'objetos'},{e:'📌',k:'pin fijar',c:'objetos'},{e:'📎',k:'clip',c:'objetos'},{e:'💡',k:'idea foco',c:'objetos'},{e:'📱',k:'movil smartphone',c:'objetos'},{e:'💻',k:'portatil laptop',c:'objetos'},{e:'🖥️',k:'pc ordenador',c:'objetos'},{e:'🕒',k:'reloj tiempo',c:'objetos'},{e:'🗂️',k:'archivos carpeta',c:'objetos'},{e:'🗒️',k:'nota bloc',c:'objetos'},{e:'📖',k:'libro abierto',c:'objetos'},{e:'📚',k:'libros',c:'objetos'},{e:'✏️',k:'lapiz escribir',c:'objetos'},
        // Naturaleza
        {e:'🌿',k:'hoja planta',c:'naturaleza'},{e:'🌳',k:'arbol',c:'naturaleza'},{e:'🌵',k:'cactus',c:'naturaleza'},{e:'🌸',k:'flor',c:'naturaleza'},{e:'🌞',k:'sol cara',c:'naturaleza'},{e:'🌙',k:'luna noche',c:'naturaleza'},{e:'⭐',k:'estrella',c:'naturaleza'},{e:'⚡',k:'rayo energia',c:'naturaleza'},{e:'🔥',k:'fuego',c:'naturaleza'},{e:'🌈',k:'arcoiris',c:'naturaleza'},{e:'🌧️',k:'lluvia',c:'naturaleza'},{e:'❄️',k:'nieve copo',c:'naturaleza'},{e:'⛄',k:'nieve muñeco',c:'naturaleza'},{e:'💧',k:'gota agua',c:'naturaleza'},
        // Comida
        {e:'🍎',k:'manzana fruta',c:'comida'},{e:'🍌',k:'platano banana',c:'comida'},{e:'🍊',k:'naranja fruta',c:'comida'},{e:'🍓',k:'fresa fruta',c:'comida'},{e:'🍇',k:'uvas fruta',c:'comida'},{e:'🍉',k:'sandia fruta',c:'comida'},{e:'🍍',k:'piña fruta',c:'comida'},{e:'🥑',k:'aguacate',c:'comida'},{e:'🥕',k:'zanahoria',c:'comida'},{e:'🌽',k:'maiz',c:'comida'},{e:'🍞',k:'pan',c:'comida'},{e:'🧀',k:'queso',c:'comida'},{e:'🍗',k:'pollo muslo',c:'comida'},{e:'🍕',k:'pizza',c:'comida'},{e:'🍔',k:'hamburguesa',c:'comida'},{e:'🍟',k:'patatas fritas',c:'comida'},{e:'🌮',k:'taco',c:'comida'},{e:'🍣',k:'sushi',c:'comida'},{e:'🍪',k:'galleta',c:'comida'},{e:'🍰',k:'pastel tarta',c:'comida'},
        // Transporte
        {e:'🚗',k:'coche auto carro',c:'transporte'},{e:'🚕',k:'taxi',c:'transporte'},{e:'🚌',k:'bus autobus',c:'transporte'},{e:'🚑',k:'ambulancia',c:'transporte'},{e:'🚒',k:'bomberos camión',c:'transporte'},{e:'🚚',k:'camion reparto',c:'transporte'},{e:'🚲',k:'bicicleta',c:'transporte'},{e:'🏍️',k:'moto motocicleta',c:'transporte'},{e:'🚀',k:'cohete',c:'transporte'},{e:'✈️',k:'avion vuelo',c:'transporte'},{e:'🚁',k:'helicoptero',c:'transporte'},{e:'🚢',k:'barco crucero',c:'transporte'},
        // Deporte
        {e:'⚽',k:'futbol',c:'deporte'},{e:'🏀',k:'baloncesto',c:'deporte'},{e:'🏈',k:'futbol americano',c:'deporte'},{e:'🎾',k:'tenis',c:'deporte'},{e:'🏐',k:'voleibol',c:'deporte'},{e:'🏓',k:'ping pong',c:'deporte'},{e:'🥊',k:'boxeo',c:'deporte'},{e:'🏸',k:'badminton',c:'deporte'},{e:'🥋',k:'artes marciales',c:'deporte'},{e:'⛷️',k:'esqui',c:'deporte'},
        // Símbolos
        {e:'⭐',k:'estrella favorito',c:'simbolos'},{e:'⭕',k:'circulo rojo',c:'simbolos'},{e:'✅',k:'check correcto',c:'simbolos'},{e:'❌',k:'equis error',c:'simbolos'},{e:'⚠️',k:'alerta peligro',c:'simbolos'},{e:'❓',k:'pregunta',c:'simbolos'},{e:'❗',k:'exclamacion',c:'simbolos'},{e:'♻️',k:'reciclar',c:'simbolos'},{e:'🔒',k:'candado cerrado',c:'simbolos'},{e:'🔓',k:'candado abierto',c:'simbolos'},{e:'🔑',k:'llave',c:'simbolos'},{e:'🚫',k:'prohibido',c:'simbolos'}
    ]; }
    applyEmojiFilters(){ const term=(this.emojiSearch.value||'').toLowerCase().trim(); this.filteredEmojis=this.getEmojiData().filter(e=> (this.activeCategory? e.c===this.activeCategory:true) && (!term || e.k.includes(term))); this.populateEmojis(); }
    populateEmojis(){ if(!this.emojiGrid)return; this.emojiGrid.innerHTML=this.filteredEmojis.map(o=>`<div class="emoji-item" draggable="true" data-e="${o.e}" title="${o.k}" role="option" aria-label="${o.k}">${o.e}</div>`).join(''); [...this.emojiGrid.querySelectorAll('.emoji-item')].forEach(node=>{node.addEventListener('click',()=>{this.insertEmoji(node.dataset.e);}); node.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/plain',node.dataset.e);});}); }
    insertEmoji(eChar){ const ta=this.textOutput; const start=ta.selectionStart; const end=ta.selectionEnd; const val=ta.value; const before=val.slice(0,start); const after=val.slice(end); const spaceBefore= before && !before.endsWith(' ') && !/\n$/.test(before) ? ' ' : ''; const spaceAfter= after && !after.startsWith(' ') ? ' ' : ''; const insert= spaceBefore+eChar+spaceAfter; ta.value=before+insert+after; const newPos=(before+insert).length; ta.focus(); ta.setSelectionRange(newPos,newPos); this.updateWordCount(); }
    startListening(){
        if(this.recognitionMode==='plugin'){
            if(!(this.speechPlugin)){this.showToast('Plugin no disponible','error');return;}
            this.manualStop=false;this.isListening=true;this.updateStatus('Escuchando...','🎧');this.playBtn.disabled=true;this.stopBtn.disabled=false;this.lastResultIndex=0;this.resetSilenceTimer();
            const opts={language:this.spanishLanguages[this.currentLangIndex]||'es-ES',matches:1,showPartial:true,showPopup:false,prompt:''};
            this._lastPluginPartial='';
            try{
                this.speechPlugin.startListening(opts,(result)=>{
                    if(!Array.isArray(result)||!result.length)return;
                    const phrase=result[0];
                    if(!phrase)return;
                    if(phrase===this._lastPluginPartial) return; // evita duplicados
                    this._lastPluginPartial=phrase;
                    // Consideramos cada emisión como final para simplicidad
                    const textWithSpace=this.ensureProperSpacing(phrase.trim());
                    this.insertTextAtCursor(textWithSpace+' ');
                    this.updateWordCount();
                },(err)=>{console.error(err);this.showToast('Err plugin','error');this.stopListening();});
            }catch(e){this.showToast('Error plugin','error');this.stopListening();}
            return;
        }
        if(!this.recognition){this.showToast('Reconocimiento no disponible','error');return;}
        try{this.manualStop=false;this.lastResultIndex=0;this.recognition.start();}catch(e){this.showToast('Error al iniciar','error');}}
    stopListening(){
        if(this.recognitionMode==='plugin'){
            this.manualStop=true;this.isListening=false;this.playBtn.disabled=false;this.stopBtn.disabled=true;this.updateStatus('Listo para escuchar','🎤');this.clearSilenceTimer();
            try{this.speechPlugin && this.speechPlugin.stopListening(()=>{},()=>{});}catch(_e){}
            setTimeout(()=>{this.addAutomaticComma();this.setCursorToEnd();},140);return;
        }
        this.manualStop=true;if(this.recognition&&this.isListening){this.recognition.stop();}this.isListening=false;this.playBtn.disabled=false;this.stopBtn.disabled=true;this.updateStatus('Listo para escuchar','🎤');this.clearSilenceTimer();setTimeout(()=>{this.addAutomaticComma();this.setCursorToEnd();},140);}    
    resetSilenceTimer(){this.clearSilenceTimer();this.silenceTimer=setTimeout(()=>{if(this.isListening){this.manualStop=true;this.stopListening();}},6000);}
    clearSilenceTimer(){if(this.silenceTimer){clearTimeout(this.silenceTimer);this.silenceTimer=null;}}
    addAutomaticComma(){if(!this.autoCommaEnabled)return;const txt=this.textOutput.value;if(!txt.trim())return;const trimmed=txt.trimEnd();const last=trimmed.slice(-1);if([',','.','!','?',';',':'].includes(last))return;this.textOutput.value=trimmed+',';this.updateWordCount();}
    setCursorToEnd(){this.textOutput.focus();let len=this.textOutput.value.length;if(this.textOutput.value.endsWith(' '))len--;this.textOutput.setSelectionRange(len,len);}
    focusTextArea(){setTimeout(()=>{this.textOutput.focus();this.capitalizeExistingText();},80);}
    capitalizeExistingText(){const t=this.textOutput.value;if(t.length>0){const f=t.charAt(0);if(f!==f.toUpperCase()&&/[a-záéíóúñü]/.test(f)){this.textOutput.value=f.toUpperCase()+t.slice(1);}}}
    insertTextAtCursor(text){const ta=this.textOutput;const start=ta.selectionStart;const end=ta.selectionEnd;const current=ta.value;const capital=this.capitalizeText(text,start);let newText=current.substring(0,start)+capital+current.substring(end);ta.value=newText;let newPos=start+capital.length;if(capital.endsWith(' '))newPos--;ta.setSelectionRange(newPos,newPos);ta.focus();}
    showInterimPreview(_t){}
    capitalizeText(text,cursorPos){const before=this.textOutput.value.substring(0,cursorPos);if(this.shouldCapitalize(before)&&text.trim().length>0){const trim=text.trim();const cap=trim.charAt(0).toUpperCase()+trim.slice(1);const leading=text.match(/^\s*/)[0];return leading+cap;}return text;}
    shouldCapitalize(before){if(this.nextWordShouldCapitalize){this.nextWordShouldCapitalize=false;return true;}if(!before.trim())return true;const trimmed=before.trim();const last=trimmed.slice(-1);if(['.','!','?',':',';'].includes(last))return true;if(/[.!?:;]\s*$/.test(before))return true;return false;}
    ensureProperSpacing(text){if(!text)return'';const ta=this.textOutput;const cursor=ta.selectionStart;const before=ta.value.substring(0,cursor);const after=ta.value.substring(cursor);const needsBefore=this.needsSpaceBefore(before,text);const needsAfter=this.needsSpaceAfter(text,after);let final=text.trim();if(needsBefore)final=' '+final;if(needsAfter)final=final+' ';return final;}
    needsSpaceBefore(before,newText){if(!before)return false;if(/[ \n\t]$/.test(before))return false;const last=before.slice(-1);if([',','.','!','?',';',':','"','\'','\)','\]','}','>','-','—'].includes(last))return false;if(/^[.,;:!?"'\)\]\}>]/.test(newText.trim()))return false;return true;}
    needsSpaceAfter(newText,after){if(!after)return true;if(/^[ \n\t]/.test(after))return false;if(/[.,;:!?"'(\[{<]$/.test(newText.trim())){if(/["'(\[{<]$/.test(newText.trim()))return false;}if(/^[.,;:!?'"\)\]\}>]/.test(after))return false;return true;}
    // (eliminado duplicado handleManualInput sin guardado) 
    isPunctuationThatNeedsSpace(c){return[',','.',';',':','!','?'].includes(c);} 
    addSpaceAfterPunctuation(){const ta=this.textOutput;const pos=ta.selectionStart;const t=ta.value;const after=t.charAt(pos);if(after!==' '){ta.value=t.slice(0,pos)+' '+t.slice(pos);ta.setSelectionRange(pos+1,pos+1);}}
    checkAndCapitalizeNextWord(cursor){const before=this.textOutput.value.substring(0,cursor);if(/[.!?:;]\s+$/.test(before))this.nextWordShouldCapitalize=true;}
    updateStatus(txt,icon){this.statusText.textContent=txt;this.statusIcon.textContent=icon;}
    updateWordCount(){const text=this.textOutput.value.trim();const words=text?text.split(/\s+/).length:0;this.wordCount.textContent=words+' palabras';this.saveDraft();}
    saveDraft(){try{localStorage.setItem('dictafono.draft',this.textOutput.value);}catch(e){} }
    restoreDraft(){try{const d=localStorage.getItem('dictafono.draft');if(d){this.textOutput.value=d;this.updateWordCount();}}catch(e){} }
    // Entrada manual: gestión de espacios tras puntuación + capitalización + guardado
    handleManualInput(e){if(this.isListening)return;if(['insertText','insertCompositionText'].includes(e.inputType)){const data=e.data;if(this.isPunctuationThatNeedsSpace(data)){setTimeout(()=>{const t=this.textOutput.value;const pos=this.textOutput.selectionStart;const after=t.charAt(pos);if(after!==' '){this.textOutput.value=t.slice(0,pos)+' '+t.slice(pos);this.textOutput.setSelectionRange(pos+1,pos+1);}},10);}if(e.data===' '){this.checkAndCapitalizeNextWord(this.textOutput.selectionStart);}}this.saveDraft();}
    async copyToClipboard(){const t=this.textOutput.value;if(!t.trim()){this.showToast('No hay texto para copiar','error');return;}try{await navigator.clipboard.writeText(t);this.showToast('Copiado','success');}catch(e){this.textOutput.select();document.execCommand('copy');this.showToast('Copiado','success');}}
    clearText(){if(!this.textOutput.value.trim()){this.showToast('No hay texto para borrar','error');return;}if(confirm('¿Borrar todo el texto?')){this.textOutput.value='';this.lastResultIndex=0;this.updateWordCount();this.saveDraft();this.focusTextArea();this.showToast('Texto borrado','success');}}
    // saveText método legacy eliminado (reemplazado por archivar)
    showToast(msg,type='info',dur=2500){this.toast.textContent=msg;this.toast.className='toast '+type+' show';setTimeout(()=>{this.toast.classList.remove('show');},dur);}
    async runLanguageToolAuto(){const text=this.textOutput.value;if(!text.trim()){this.showToast('No hay texto para corregir','error');return;}const btn=this.languageToolBtn;if(btn){btn.disabled=true;const prev=btn.innerHTML;btn.innerHTML='⏳ Corrigiendo...';try{const form=new URLSearchParams();form.append('text',text);form.append('language','es');form.append('level','picky');const res=await fetch('https://api.languagetool.org/v2/check',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()});if(!res.ok)throw new Error('HTTP '+res.status);const data=await res.json();const {corrected,unresolved}=this.applyLTCorrections(text,data.matches||[]);this.textOutput.value=corrected;this.setCursorToEnd();this.showToast(`Correcciones: ${data.matches.length-unresolved.length}`,'success');if(unresolved.length)this.showUnresolvedLT(unresolved);}catch(e){console.error(e);this.showToast('Error al corregir','error');}finally{btn.disabled=false;btn.innerHTML=prev;}}}
    applyLTCorrections(text,matches){if(!matches.length)return{corrected:text,unresolved:[]};const sorted=[...matches].sort((a,b)=>a.offset-b.offset);let out='';let last=0;const unresolved=[];sorted.forEach(m=>{if(m.offset<last)return;out+=text.slice(last,m.offset);const orig=text.substr(m.offset,m.length);if(m.replacements&&m.replacements.length){out+=m.replacements[0].value;}else{out+=orig;unresolved.push({original:orig,message:m.message});}last=m.offset+m.length;});out+=text.slice(last);return{corrected:out,unresolved};}
    showUnresolvedLT(unresolved){const existing=document.querySelector('.spell-check-overlay');if(existing)existing.remove();const overlay=document.createElement('div');overlay.className='spell-check-overlay';const items=unresolved.map(u=>`<li><strong>${this.escapeHtml(u.original)}</strong><br><span style="opacity:.7;font-size:.8rem;">${this.escapeHtml(u.message)}</span></li>`).join('');overlay.innerHTML=`<div class="spell-check-modal"><div class="spell-check-header"><h3>Palabras no corregidas</h3><p>Revisión manual recomendada:</p></div><div class="spell-check-content" style="max-height:300px;overflow:auto;"><ul style="list-style:disc;margin-left:20px;display:flex;flex-direction:column;gap:10px;">${items}</ul></div><div class="spell-check-actions"><button id="ltCloseUnresolved" class="control-btn success">Cerrar</button></div></div>`;document.body.appendChild(overlay);overlay.querySelector('#ltCloseUnresolved').addEventListener('click',()=>overlay.remove());document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){overlay.remove();document.removeEventListener('keydown',esc);}});}
    escapeHtml(str){return str.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
}

document.addEventListener('DOMContentLoaded',()=>new DictafonoApp());
