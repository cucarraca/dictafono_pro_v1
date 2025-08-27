class DictafonoApp {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.silenceTimer = null;
        t        // Event listener para espaciado automático
        this.textOutput.addEventListener('input', (e) => {
            this.updateWordCount();
            this.handleManualInput(e);
        });
    } = 0;
        this.manualStop = false;
        this.nextWordShouldCapitalize = false;
        this.autoCommaEnabled = true;
        this.currentLangIndex = 0;
        this.spanishLanguages = ['es-ES', 'es-US', 'es-MX', 'es-AR', 'es-CO'];
        this.lastSpaceAdded = 0; // Timestamp para evitar espacios duplicados
        this.processingPunctuation = null; // Para control de eventos duplicados
        this.processingTime = 0;
        
        this.initElements();
        this.initSpeechRecognition();
        this.bindEvents();
        this.updateWordCount();
        this.focusTextArea();
    }

    initElements() {
        this.playBtn = document.getElementById('playBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.spellcheckBtn = document.getElementById('spellcheckBtn');
        this.testBtn = document.getElementById('testBtn');
        this.textOutput = document.getElementById('textOutput');
        this.statusText = document.getElementById('statusText');
        this.statusIcon = document.getElementById('statusIcon');
        this.wordCount = document.getElementById('wordCount');
        this.toast = document.getElementById('toast');
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            this.showToast('Tu navegador no soporta reconocimiento de voz', 'error');
            return;
        }

        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.spanishLanguages[this.currentLangIndex];
        this.recognition.maxAlternatives = 1;
        
        console.log(`Configurando reconocimiento con idioma: ${this.recognition.lang}`);

        this.recognition.onstart = () => {
            this.isListening = true;
            this.lastResultIndex = 0;
            this.updateStatus('Escuchando...', '🎧');
            this.playBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.resetSilenceTimer();
        };

        this.recognition.onresult = (event) => {
            console.log('Resultado de reconocimiento:', event);
            
            const startIndex = this.lastResultIndex || 0;
            
            for (let i = startIndex; i < event.results.length; i++) {
                if (event.results[i] && event.results[i][0]) {
                    const transcript = event.results[i][0].transcript;
                    console.log(`Transcripción ${i}:`, transcript, 'Final:', event.results[i].isFinal);
                    
                    if (event.results[i].isFinal) {
                        const transcriptText = transcript.trim();
                        const textWithSpace = this.ensureProperSpacing(transcriptText);
                        
                        this.insertTextAtCursor(textWithSpace);
                        this.lastResultIndex = i + 1;
                        this.updateWordCount();
                    }
                } else {
                    console.warn('Resultado vacío en índice:', i);
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            let mensaje = 'Error en el reconocimiento de voz';
            
            switch(event.error) {
                case 'no-speech':
                    mensaje = 'No se detectó voz. Intenta hablar más cerca del micrófono.';
                    break;
                case 'audio-capture':
                    mensaje = 'No se puede acceder al micrófono. Verifica los permisos.';
                    break;
                case 'not-allowed':
                    mensaje = 'Micrófono bloqueado. Permite el acceso al micrófono.';
                    break;
                case 'network':
                    mensaje = 'Error de conexión. Verifica tu conexión a internet.';
                    break;
                case 'language-not-supported':
                    if (this.currentLangIndex < this.spanishLanguages.length - 1) {
                        this.currentLangIndex++;
                        this.showToast(`Probando con ${this.spanishLanguages[this.currentLangIndex]}...`, 'info');
                        this.initSpeechRecognition();
                        return;
                    } else {
                        mensaje = 'El español no está soportado en este navegador.';
                    }
                    break;
                default:
                    mensaje = `Error: ${event.error}`;
            }
            
            this.showToast(mensaje, 'error');
            this.stopListening();
        };

        this.recognition.onend = () => {
            console.log('Reconocimiento finalizado');
            if (this.isListening && !this.manualStop) {
                console.log('Reiniciando reconocimiento automáticamente');
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            this.recognition.start();
                        } catch (error) {
                            console.log('Error al reiniciar:', error);
                            this.stopListening();
                        }
                    }
                }, 100);
            } else {
                this.stopListening();
            }
        };
    }

    bindEvents() {
        this.playBtn.addEventListener('click', () => this.startListening());
        this.stopBtn.addEventListener('click', () => this.stopListening());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.saveBtn.addEventListener('click', () => this.saveText());
        this.spellcheckBtn.addEventListener('click', () => this.checkSpelling());
        this.testBtn.addEventListener('click', () => this.testCursorPosition());
        
        // Event listener para espaciado automático
        this.textOutput.addEventListener('input', (e) => {
            this.updateWordCount();
            this.handleManualInput(e);
        });
        
        // Evento complementario para asegurar detección en todos los navegadores
        this.textOutput.addEventListener('keydown', (e) => {
            // Solo procesar si no estamos dictando
            if (this.isListening) return;
            
            // Verificar si es un signo de puntuación que necesita espacio
            if (this.isPunctuationThatNeedsSpace(e.key)) {
                console.log(`� Keydown detectado para: "${e.key}"`);
                // Marcamos que vamos a procesar este carácter
                this.processingPunctuation = e.key;
                this.processingTime = Date.now();
            }
        });
    }

    startListening() {
        if (!this.recognition) {
            this.showToast('Reconocimiento de voz no disponible', 'error');
            return;
        }

        try {
            this.manualStop = false;
            this.lastResultIndex = 0;
            this.recognition.start();
        } catch (error) {
            this.showToast('Error al iniciar el micrófono', 'error');
        }
    }

    stopListening() {
        this.manualStop = true;
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isListening = false;
        this.playBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('Listo para escuchar', '🎤');
        this.clearSilenceTimer();
        
        setTimeout(() => {
            this.addAutomaticComma();
            this.setCursorToEnd();
        }, 150);
        
        console.log('Reconocimiento detenido manualmente');
    }

    resetSilenceTimer() {
        this.clearSilenceTimer();
        this.silenceTimer = setTimeout(() => {
            if (this.isListening) {
                console.log('Timer de 6 segundos activado');
                this.showToast('Se detuvo por inactividad', 'info');
                this.manualStop = true;
                this.stopListening();
                
                setTimeout(() => {
                    this.setCursorToEnd();
                }, 200);
            }
        }, 6000);
    }

    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    addAutomaticComma() {
        console.log('🟢 COMA: Iniciando addAutomaticComma()');
        
        if (!this.autoCommaEnabled) {
            return;
        }
        
        const textarea = this.textOutput;
        const text = textarea.value;
        
        if (!text || text.trim().length === 0) {
            return;
        }
        
        const trimmedText = text.trimEnd();
        if (trimmedText.length === 0) {
            return;
        }
        
        const lastChar = trimmedText.slice(-1);
        const existingPunctuation = [',', '.', '!', '?', ';', ':'];
        
        if (existingPunctuation.includes(lastChar)) {
            console.log(`🔴 COMA: Ya termina con "${lastChar}"`);
            return;
        }
        
        const newText = trimmedText + ',';
        textarea.value = newText;
        this.updateWordCount();
        
        console.log(`🟢 COMA: ¡ÉXITO! "${trimmedText}" → "${newText}"`);
        this.showToast('Coma agregada automáticamente', 'info');
    }

    setCursorToEnd() {
        this.textOutput.focus();
        const text = this.textOutput.value;
        let textLength = text.length;
        
        if (text.endsWith(' ')) {
            textLength = textLength - 1;
            console.log('🎯 Cursor pegado a la última letra');
        }
        
        this.textOutput.setSelectionRange(textLength, textLength);
        this.textOutput.scrollTop = this.textOutput.scrollHeight;
        
        console.log('🎯 Cursor posicionado en:', textLength);
    }

    focusTextArea() {
        setTimeout(() => {
            this.textOutput.focus();
            this.capitalizeExistingText();
            console.log('Caja de texto enfocada');
        }, 100);
    }

    capitalizeExistingText() {
        const text = this.textOutput.value;
        if (text.length > 0) {
            const firstChar = text.charAt(0);
            if (firstChar !== firstChar.toUpperCase() && /[a-záéíóúñü]/.test(firstChar)) {
                const capitalizedText = firstChar.toUpperCase() + text.slice(1);
                this.textOutput.value = capitalizedText;
                console.log('Primera palabra capitalizada');
            }
        }
    }

    insertTextAtCursor(text) {
        const textarea = this.textOutput;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentText = textarea.value;
        
        const capitalizedText = this.capitalizeText(text, start);
        
        const newText = currentText.substring(0, start) + capitalizedText + currentText.substring(end);
        textarea.value = newText;
        
        let newCursorPosition = start + capitalizedText.length;
        
        if (capitalizedText.endsWith(' ')) {
            newCursorPosition = newCursorPosition - 1;
            console.log('📍 Cursor pegado a la última letra');
        }
        
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        textarea.focus();
        textarea.scrollTop = textarea.scrollHeight;
        
        console.log(`Texto insertado: "${capitalizedText}" | Cursor en: ${newCursorPosition}`);
    }

    capitalizeText(text, cursorPosition) {
        const textarea = this.textOutput;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        
        const needsCapitalization = this.shouldCapitalize(textBeforeCursor);
        
        if (needsCapitalization && text.trim().length > 0) {
            const trimmedText = text.trim();
            const firstChar = trimmedText.charAt(0).toUpperCase();
            const restOfText = trimmedText.slice(1);
            
            const leadingSpaces = text.match(/^\s*/)[0];
            const capitalizedText = leadingSpaces + firstChar + restOfText;
            
            console.log(`Texto capitalizado: "${text}" → "${capitalizedText}"`);
            return capitalizedText;
        }
        
        return text;
    }

    shouldCapitalize(textBeforeCursor) {
        if (this.nextWordShouldCapitalize) {
            this.nextWordShouldCapitalize = false;
            console.log('Capitalización: Por flag manual');
            return true;
        }
        
        if (!textBeforeCursor || textBeforeCursor.trim().length === 0) {
            console.log('Capitalización: Inicio del documento');
            return true;
        }
        
        const trimmedBefore = textBeforeCursor.trim();
        if (trimmedBefore.length === 0) {
            console.log('Capitalización: Solo espacios antes');
            return true;
        }
        
        const lastChar = trimmedBefore.slice(-1);
        const sentenceEnders = ['.', '!', '?', ':', ';'];
        
        if (sentenceEnders.includes(lastChar)) {
            console.log(`Capitalización: Después de "${lastChar}"`);
            return true;
        }
        
        const sentenceEndPattern = /[.!?:;]\s*$/;
        if (sentenceEndPattern.test(textBeforeCursor)) {
            console.log('Capitalización: Patrón de fin de oración detectado');
            return true;
        }
        
        console.log('Capitalización: No necesaria');
        return false;
    }

    ensureProperSpacing(text) {
        if (!text || text.length === 0) {
            return '';
        }
        
        const textarea = this.textOutput;
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        const textAfterCursor = textarea.value.substring(cursorPosition);
        
        const needsSpaceBefore = this.needsSpaceBefore(textBeforeCursor, text);
        const needsSpaceAfter = this.needsSpaceAfter(text, textAfterCursor);
        
        let finalText = text.trim();
        
        if (needsSpaceBefore) {
            finalText = ' ' + finalText;
        }
        
        if (needsSpaceAfter) {
            finalText = finalText + ' ';
        }
        
        console.log(`Espaciado: "${text}" → "${finalText}"`);
        return finalText;
    }

    needsSpaceBefore(textBefore, newText) {
        console.log(`🔍 ESPACIO: Analizando textBefore: "${textBefore}"`);
        
        if (!textBefore || textBefore.length === 0) {
            console.log('🔍 ESPACIO: No hay texto antes');
            return false;
        }
        
        if (textBefore.endsWith(' ') || textBefore.endsWith('\n') || textBefore.endsWith('\t')) {
            console.log('🔍 ESPACIO: Ya termina con espacio');
            return false;
        }
        
        const lastChar = textBefore.slice(-1);
        const symbols = [',', '.', '!', '?', ';', ':', '"', "'", ')', ']', '}', '>', '-', '—'];
        
        if (symbols.includes(lastChar)) {
            console.log(`🔍 ESPACIO: Después del símbolo "${lastChar}" - SIN espacio`);
            return false;
        }
        
        const punctuationStart = /^[.,;:!?'")\]}>]/;
        if (punctuationStart.test(newText.trim())) {
            console.log('🔍 ESPACIO: Nuevo texto empieza con puntuación');
            return false;
        }
        
        console.log('🔍 ESPACIO: Caso normal - CON espacio');
        return true;
    }

    needsSpaceAfter(newText, textAfter) {
        if (!textAfter || textAfter.length === 0) {
            return true;
        }
        
        if (textAfter.startsWith(' ') || textAfter.startsWith('\n') || textAfter.startsWith('\t')) {
            return false;
        }
        
        const punctuationEnd = /[.,;:!?'"(\[{<]$/;
        if (punctuationEnd.test(newText.trim())) {
            const noSpaceAfter = /['"(\[{<]$/;
            if (noSpaceAfter.test(newText.trim())) {
                return false;
            }
        }
        
        const punctuationAfterStart = /^[.,;:!?'")\]}>]/;
        if (punctuationAfterStart.test(textAfter)) {
            return false;
        }
        
        return true;
    }

    handleManualInput(event) {
        console.log('🔍 handleManualInput:', event.inputType, event.data);
        
        if (this.isListening) {
            console.log('⏸️ Ignorando - está dictando');
            return;
        }
        
        const textarea = this.textOutput;
        const inputType = event.inputType;
        
        if (inputType === 'insertText' || inputType === 'insertCompositionText') {
            const insertedData = event.data;
            
            console.log(`✏️ Texto insertado: "${insertedData}"`);
            
            // ESPACIADO AUTOMÁTICO DESPUÉS DE SIGNOS
            if (this.isPunctuationThatNeedsSpace(insertedData)) {
                console.log(`🔤 Signo detectado: "${insertedData}"`);
                
                // Usar un pequeño delay para que el navegador termine de procesar la inserción
                setTimeout(() => {
                    this.addSpaceAfterPunctuation(insertedData);
                }, 5);
            }
        }
        
        console.log(`Entrada procesada: ${inputType}`);
    }

    isPunctuationThatNeedsSpace(char) {
        const spanishPunctuation = [',', '.', ';', ':', '!', '?'];
        return spanishPunctuation.includes(char);
    }

    addSpaceAfterPunctuation(punctuation) {
        console.log(`🔤 Agregando espacio después de "${punctuation}"`);
        
        const textarea = this.textOutput;
        const cursorPos = textarea.selectionStart;
        const text = textarea.value;
        
        console.log(`📍 Estado: texto="${text}", cursor=${cursorPos}`);
        
        // Verificar si ya hay espacio después del cursor
        const charAfter = text.charAt(cursorPos);
        
        if (charAfter !== ' ') {
            const beforeCursor = text.substring(0, cursorPos);
            const afterCursor = text.substring(cursorPos);
            
            textarea.value = beforeCursor + ' ' + afterCursor;
            
            const newPos = cursorPos + 1;
            textarea.setSelectionRange(newPos, newPos);
            
            console.log(`✅ Espacio agregado! Cursor en: ${newPos}`);
            this.showToast(`Espacio agregado después de "${punctuation}"`, 'success');
        } else {
            console.log(`ℹ️ Ya hay espacio después de "${punctuation}"`);
        }
    }

    checkAndCapitalizeNextWord(cursorPosition) {
        const textarea = this.textOutput;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        
        const sentenceEndPattern = /[.!?:;]\s+$/;
        if (sentenceEndPattern.test(textBeforeCursor)) {
            this.nextWordShouldCapitalize = true;
            console.log('Próxima palabra será capitalizada');
        }
    }

    updateStatus(text, icon) {
        this.statusText.textContent = text;
        this.statusIcon.textContent = icon;
    }

    updateWordCount() {
        const text = this.textOutput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        this.wordCount.textContent = words + ' palabras';
    }

    async copyToClipboard() {
        const text = this.textOutput.value;
        if (!text.trim()) {
            this.showToast('No hay texto para copiar', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Texto copiado al portapapeles', 'success');
        } catch (error) {
            this.textOutput.select();
            document.execCommand('copy');
            this.showToast('Texto copiado al portapapeles', 'success');
        }
    }

    clearText() {
        if (!this.textOutput.value.trim()) {
            this.showToast('No hay texto para borrar', 'error');
            return;
        }

        if (confirm('¿Borrar todo el texto?')) {
            this.textOutput.value = '';
            this.lastResultIndex = 0;
            this.updateWordCount();
            this.focusTextArea();
            this.showToast('Texto borrado', 'success');
        }
    }

    saveText() {
        const text = this.textOutput.value;
        if (!text.trim()) {
            this.showToast('No hay texto para guardar', 'error');
            return;
        }

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dictado-' + new Date().getTime() + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Archivo guardado', 'success');
    }

    checkSpelling() {
        const text = this.textOutput.value;
        if (!text.trim()) {
            this.showToast('No hay texto para revisar', 'error');
            return;
        }

        // Correcciones básicas
        const corrections = {
            'ola': 'hola',
            'cmo': 'cómo',
            'como': 'cómo',
            'aver': 'haber',
            'valla': 'vaya',
            'echo': 'hecho',
            'asta': 'hasta',
            'mas': 'más',
            'tambien': 'también',
            'aqui': 'aquí',
            'solo': 'sólo',
            'esta': 'está',
            'si': 'sí',
            'tu': 'tú'
        };

        let hasErrors = false;
        let correctedText = text;
        
        Object.keys(corrections).forEach(wrong => {
            const regex = new RegExp('\\b' + wrong + '\\b', 'gi');
            if (regex.test(text)) {
                correctedText = correctedText.replace(regex, corrections[wrong]);
                hasErrors = true;
            }
        });

        if (hasErrors) {
            if (confirm('Se encontraron errores ortográficos. ¿Aplicar correcciones?')) {
                this.textOutput.value = correctedText;
                this.updateWordCount();
                this.focusTextArea();
                this.showToast('Correcciones aplicadas', 'success');
            }
        } else {
            this.showToast('No se encontraron errores', 'info');
        }
    }

    testCursorPosition() {
        this.showToast('🧪 Probando espaciado automático', 'info');
        console.log('🧪 === PRUEBA DE ESPACIADO AUTOMÁTICO ===');
        
        this.textOutput.value = 'Hola mundo';
        this.textOutput.focus();
        this.setCursorToEnd();
        
        setTimeout(() => {
            console.log('🧪 Estado inicial:', this.textOutput.value);
            console.log('🧪 Cursor inicial:', this.textOutput.selectionStart);
            
            // Simular agregar coma
            this.textOutput.value += ',';
            this.textOutput.setSelectionRange(this.textOutput.value.length, this.textOutput.value.length);
            
            console.log('🧪 Después de coma:', this.textOutput.value);
            console.log('🧪 Cursor:', this.textOutput.selectionStart);
            
            // Llamar función de espaciado
            this.addSpaceAfterPunctuation(',');
            
            setTimeout(() => {
                console.log('🧪 Resultado:', this.textOutput.value);
                console.log('🧪 Cursor final:', this.textOutput.selectionStart);
                this.showToast(`✅ Resultado: "${this.textOutput.value}"`, 'success');
            }, 100);
            
        }, 1000);
        
        setTimeout(() => {
            this.showToast('🔤 Ahora prueba escribir , . ; : ! ? manualmente', 'info');
        }, 3000);
        
        console.log('🧪 TEST: Espaciado automático activado');
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = 'toast ' + type + ' show';
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DictafonoApp();
});
