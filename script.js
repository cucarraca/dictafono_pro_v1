class DictafonoApp {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.silenceTimer = null;
        this.lastResultIndex = 0; // Índice del último resultado procesado
        this.manualStop = false; // Control de detención manual
        this.nextWordShouldCapitalize = false; // Para capitalización después de escritura manual
        this.autoCommaEnabled = true; // Activar/desactivar coma automática
        this.currentLangIndex = 0;
        this.spanishLanguages = ['es-ES', 'es-US', 'es-MX', 'es-AR', 'es-CO'];
        
        this.initElements();
        this.initSpeechRecognition();
        this.bindEvents();
        this.updateWordCount();
        this.focusTextArea(); // Enfocar al iniciar
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

        // Configuración optimizada para español
        this.recognition.continuous = false; // Cambiar a false para evitar repeticiones
        this.recognition.interimResults = true;
        this.recognition.lang = this.spanishLanguages[this.currentLangIndex];
        this.recognition.maxAlternatives = 1;
        
        // Intentar configurar el servicio con mejores parámetros
        try {
            this.recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
        } catch (e) {
            console.log('No se pudo configurar serviceURI personalizado');
        }
        
        console.log(`Configurando reconocimiento con idioma: ${this.recognition.lang}`);

        this.recognition.onstart = () => {
            this.isListening = true;
            this.lastResultIndex = 0; // Resetear índice de resultados
            this.updateStatus('Escuchando...', '🎧');
            this.playBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.resetSilenceTimer();
        };

        // Eventos adicionales para control de silencio
        this.recognition.onspeechstart = () => {
            console.log('Inicio de voz detectado');
            this.clearSilenceTimer();
        };

        this.recognition.onspeechend = () => {
            console.log('Fin de voz detectado');
            this.resetSilenceTimer();
        };

        this.recognition.onsoundstart = () => {
            console.log('Sonido detectado');
            this.clearSilenceTimer();
        };

        this.recognition.onsoundend = () => {
            console.log('Fin de sonido detectado');
            this.resetSilenceTimer();
        };

        this.recognition.onresult = (event) => {
            console.log('Resultado de reconocimiento:', event);
            
            // Procesar solo desde el último índice procesado
            const startIndex = this.lastResultIndex || 0;
            
            for (let i = startIndex; i < event.results.length; i++) {
                if (event.results[i] && event.results[i][0]) {
                    const transcript = event.results[i][0].transcript;
                    console.log(`Transcripción ${i}:`, transcript, 'Final:', event.results[i].isFinal);
                    
                    if (event.results[i].isFinal) {
                        // Procesar el texto final y asegurar espaciado correcto
                        const transcriptText = transcript.trim(); // Limpiar espacios extra
                        const textWithSpace = this.ensureProperSpacing(transcriptText);
                        
                        // Solo insertar texto final nuevo en la posición del cursor
                        this.insertTextAtCursor(textWithSpace);
                        this.lastResultIndex = i + 1; // Actualizar índice procesado
                        this.updateWordCount();
                    } else {
                        // Para resultados intermedios, mostrar preview sin insertar permanentemente
                        this.showInterimPreview(transcript);
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
            // Si estábamos escuchando y no fue una detención manual, reiniciar
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
        
        // Listener unificado para input
        this.textOutput.addEventListener('input', (e) => {
            this.updateWordCount();
            this.handleManualInput(e);
        });

        // Método alternativo: usar keypress para capturar teclas directamente
        this.textOutput.addEventListener('keypress', (e) => {
            console.log('🔑 Tecla presionada:', e.key, 'Código:', e.keyCode);
            
            // No interferir si está dictando
            if (this.isListening) return;
            
            const punctuation = [',', '.', ';', ':', '!', '?'];
            if (punctuation.includes(e.key)) {
                console.log('🔤 Signo de puntuación detectado via keypress:', e.key);
                
                // Usar setTimeout para ejecutar después de que se inserte el carácter
                setTimeout(() => {
                    this.addSpaceAfterPunctuation(e.key);
                }, 10);
            }
        });
        
        // BOTÓN TEMPORAL: Doble clic en el testBtn para probar la coma
        this.testBtn.addEventListener('dblclick', () => {
            console.log('🧪 PRUEBA: Ejecutando coma automática manualmente');
            this.addAutomaticComma();
        });
        
        // BOTÓN TEMPORAL: Triple clic para probar detección de símbolos
        let clickCount = 0;
        this.testBtn.addEventListener('click', () => {
            clickCount++;
            setTimeout(() => {
                if (clickCount === 3) {
                    this.testSymbolDetection();
                }
                clickCount = 0;
            }, 300);
        });
    }

    testSymbolDetection() {
        // Función para probar la detección de símbolos
        console.log('🧪 PRUEBA: Iniciando test de detección de símbolos');
        
        const testCases = [
            { text: 'palabra', cursor: 7, newText: 'nueva', expected: 'CON espacio' },
            { text: 'palabra,', cursor: 8, newText: 'nueva', expected: 'SIN espacio' },
            { text: 'texto.', cursor: 6, newText: 'siguiente', expected: 'SIN espacio' },
            { text: 'pregunta?', cursor: 9, newText: 'respuesta', expected: 'SIN espacio' },
            { text: 'exclamación!', cursor: 12, newText: 'continuar', expected: 'SIN espacio' }
        ];
        
        testCases.forEach((testCase, index) => {
            console.log(`🧪 Test ${index + 1}: "${testCase.text}" + "${testCase.newText}"`);
            
            // Simular la situación
            this.textOutput.value = testCase.text;
            this.textOutput.setSelectionRange(testCase.cursor, testCase.cursor);
            
            // Probar la lógica
            const textBefore = testCase.text.substring(0, testCase.cursor);
            const needsSpace = this.needsSpaceBefore(textBefore, testCase.newText);
            const result = needsSpace ? 'CON espacio' : 'SIN espacio';
            
            console.log(`   Resultado: ${result} (esperado: ${testCase.expected})`);
            
            if (result === testCase.expected) {
                console.log('   ✅ CORRECTO');
            } else {
                console.log('   ❌ ERROR');
            }
        });
        
        this.showToast('Revisa la consola para ver los resultados del test', 'info');
    }

    startListening() {
        if (!this.recognition) {
            this.showToast('Reconocimiento de voz no disponible', 'error');
            return;
        }

        try {
            this.manualStop = false; // Resetear flag
            this.lastResultIndex = 0; // Resetear índice para nueva sesión
            this.recognition.start();
        } catch (error) {
            this.showToast('Error al iniciar el microfono', 'error');
        }
    }

    stopListening() {
        this.manualStop = true; // Marcar como detención manual
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isListening = false;
        this.playBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('Listo para escuchar', '🎤');
        this.clearSilenceTimer();
        
        // Agregar coma automáticamente al final de la frase
        console.log('🔴 STOP: Iniciando proceso de coma automática');
        setTimeout(() => {
            console.log('🔴 STOP: Ejecutando addAutomaticComma');
            this.addAutomaticComma();
            console.log('🔴 STOP: Posicionando cursor');
            this.setCursorToEnd();
        }, 150); // Aumentar delay para asegurar procesamiento
        
        console.log('Reconocimiento detenido manualmente');
    }

    resetSilenceTimer() {
        this.clearSilenceTimer();
        this.silenceTimer = setTimeout(() => {
            if (this.isListening) {
                console.log('Timer de 6 segundos activado - deteniendo reconocimiento');
                this.showToast('Se detuvo por inactividad (6 segundos)', 'info');
                this.manualStop = true; // Marcar como detención por timer
                this.stopListening();
                
                // Asegurar que el cursor esté al final después del timer
                setTimeout(() => {
                    this.setCursorToEnd();
                }, 200);
            }
        }, 6000);
        console.log('Timer de silencio reiniciado - 6 segundos');
    }

    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    addAutomaticComma() {
        console.log('🟢 COMA: Iniciando addAutomaticComma()');
        
        // Verificar si la función está habilitada
        if (!this.autoCommaEnabled) {
            console.log('🔴 COMA: Función deshabilitada');
            return;
        }
        
        const textarea = this.textOutput;
        const text = textarea.value;
        
        console.log(`🟢 COMA: Texto actual: "${text}"`);
        console.log(`🟢 COMA: Longitud del texto: ${text.length}`);
        
        // Solo agregar coma si hay texto y no está vacío
        if (!text || text.trim().length === 0) {
            console.log('🔴 COMA: No se agregó - texto vacío');
            return;
        }
        
        // Obtener el último carácter del texto (sin contar espacios al final)
        const trimmedText = text.trimEnd();
        console.log(`🟢 COMA: Texto sin espacios finales: "${trimmedText}"`);
        
        if (trimmedText.length === 0) {
            console.log('🔴 COMA: No se agregó - solo espacios');
            return;
        }
        
        const lastChar = trimmedText.slice(-1);
        console.log(`🟢 COMA: Último carácter: "${lastChar}"`);
        
        // No agregar coma si ya termina con puntuación
        const existingPunctuation = [',', '.', '!', '?', ';', ':'];
        if (existingPunctuation.includes(lastChar)) {
            console.log(`🔴 COMA: No se agregó - ya termina con "${lastChar}"`);
            return;
        }
        
        // Método más simple: agregar coma directamente al final del texto sin espacios
        const newText = trimmedText + ',';
        textarea.value = newText;
        
        // Actualizar contador de palabras
        this.updateWordCount();
        
        console.log(`🟢 COMA: ¡ÉXITO! "${trimmedText}" → "${newText}"`);
        this.showToast('Coma agregada automáticamente', 'info');
    }

    setCursorToEnd() {
        // Enfocar el textarea y posicionar el cursor al final (pegado a la última letra)
        this.textOutput.focus();
        const text = this.textOutput.value;
        let textLength = text.length;
        
        // Si el texto termina con espacio, posicionar cursor ANTES del espacio
        if (text.endsWith(' ')) {
            textLength = textLength - 1;
            console.log('🎯 Cursor posicionado pegado a la última letra (antes del espacio final)');
        } else {
            console.log('🎯 Cursor posicionado al final del texto (sin espacio final)');
        }
        
        this.textOutput.setSelectionRange(textLength, textLength);
        
        // Scroll al final si es necesario
        this.textOutput.scrollTop = this.textOutput.scrollHeight;
        
        console.log('🎯 Cursor posicionado en posición:', textLength);
        
        // Verificar que efectivamente se posicionó
        setTimeout(() => {
            const actualPos = this.textOutput.selectionStart;
            if (actualPos === textLength) {
                console.log('✅ Cursor verificado en posición correcta:', actualPos);
            } else {
                console.warn('⚠️ Cursor no en posición esperada. Actual:', actualPos, 'Esperada:', textLength);
            }
        }, 50);
    }

    focusTextArea() {
        // Enfocar la caja de texto al cargar la aplicación
        setTimeout(() => {
            this.textOutput.focus();
            this.capitalizeExistingText(); // Capitalizar texto existente si lo hay
            console.log('Caja de texto enfocada al iniciar');
        }, 100);
    }

    capitalizeExistingText() {
        // Capitalizar la primera palabra si hay texto existente
        const text = this.textOutput.value;
        if (text.length > 0) {
            const firstChar = text.charAt(0);
            if (firstChar !== firstChar.toUpperCase() && /[a-záéíóúñü]/.test(firstChar)) {
                const capitalizedText = firstChar.toUpperCase() + text.slice(1);
                this.textOutput.value = capitalizedText;
                console.log('Primera palabra capitalizada al iniciar');
            }
        }
    }

    insertTextAtCursor(text) {
        // Insertar texto en la posición actual del cursor sin borrar el contenido existente
        const textarea = this.textOutput;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentText = textarea.value;
        
        // Aplicar capitalización automática si es necesario
        const capitalizedText = this.capitalizeText(text, start);
        
        // Insertar el nuevo texto en la posición del cursor
        const newText = currentText.substring(0, start) + capitalizedText + currentText.substring(end);
        textarea.value = newText;
        
        // CRUCIAL: Posicionar el cursor PEGADO a la última letra, no después del espacio
        let newCursorPosition = start + capitalizedText.length;
        
        // Si el texto insertado termina con espacio, mover el cursor antes del espacio
        if (capitalizedText.endsWith(' ')) {
            newCursorPosition = newCursorPosition - 1;
            console.log('📍 Cursor ajustado - pegado a la última letra (antes del espacio)');
        }
        
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        
        // Enfocar y hacer scroll si es necesario
        textarea.focus();
        textarea.scrollTop = textarea.scrollHeight;
        
        console.log(`Texto insertado: "${capitalizedText}" | Cursor en posición: ${newCursorPosition}`);
    }

    showInterimPreview(interimText) {
        // Mostrar preview temporal del texto que se está reconociendo
        // Guardamos la posición del cursor actual
        const textarea = this.textOutput;
        const cursorPosition = textarea.selectionStart;
        const originalText = textarea.value;
        
        // Mostrar preview temporal en color diferente mediante el placeholder
        const textBeforeCursor = originalText.substring(0, cursorPosition);
        const textAfterCursor = originalText.substring(cursorPosition);
        
        // Mostrar en el status lo que se está reconociendo
        this.updateStatus(`Reconociendo: "${interimText}"`, '🎧');
        
        console.log(`Preview intermedio: "${interimText}"`);
    }

    capitalizeText(text, cursorPosition) {
        // Función para aplicar capitalización automática
        const textarea = this.textOutput;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        
        // Determinar si necesita capitalización
        const needsCapitalization = this.shouldCapitalize(textBeforeCursor);
        
        if (needsCapitalization && text.trim().length > 0) {
            // Capitalizar la primera letra de la primera palabra
            const trimmedText = text.trim();
            const firstChar = trimmedText.charAt(0).toUpperCase();
            const restOfText = trimmedText.slice(1);
            
            // Mantener espacios iniciales si los había
            const leadingSpaces = text.match(/^\s*/)[0];
            const capitalizedText = leadingSpaces + firstChar + restOfText;
            
            console.log(`Texto capitalizado: "${text}" → "${capitalizedText}"`);
            return capitalizedText;
        }
        
        return text;
    }

    shouldCapitalize(textBeforeCursor) {
        // Determinar si la siguiente palabra debe empezar en mayúscula
        
        // Si está marcado para capitalizar por escritura manual
        if (this.nextWordShouldCapitalize) {
            this.nextWordShouldCapitalize = false; // Resetear flag
            console.log('Capitalización: Por flag manual');
            return true;
        }
        
        // Si no hay texto antes, es el inicio del documento
        if (!textBeforeCursor || textBeforeCursor.trim().length === 0) {
            console.log('Capitalización: Inicio del documento');
            return true;
        }
        
        // Buscar el último carácter significativo (no espacios ni saltos de línea)
        const trimmedBefore = textBeforeCursor.trim();
        if (trimmedBefore.length === 0) {
            console.log('Capitalización: Solo espacios antes');
            return true;
        }
        
        const lastChar = trimmedBefore.slice(-1);
        
        // Caracteres que indican fin de oración
        const sentenceEnders = ['.', '!', '?', ':', ';'];
        
        if (sentenceEnders.includes(lastChar)) {
            console.log(`Capitalización: Después de "${lastChar}"`);
            return true;
        }
        
        // Buscar patrones de fin de oración con espacios
        // Ejemplo: "texto.   " o "texto.\n"
        const sentenceEndPattern = /[.!?:;]\s*$/;
        if (sentenceEndPattern.test(textBeforeCursor)) {
            console.log('Capitalización: Patrón de fin de oración detectado');
            return true;
        }
        
        console.log('Capitalización: No necesaria');
        return false;
    }

    ensureProperSpacing(text) {
        // Asegurar espaciado correcto para el texto dictado
        if (!text || text.length === 0) {
            return '';
        }
        
        const textarea = this.textOutput;
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        const textAfterCursor = textarea.value.substring(cursorPosition);
        
        // Verificar si necesitamos un espacio antes del texto
        const needsSpaceBefore = this.needsSpaceBefore(textBeforeCursor, text);
        
        // Verificar si necesitamos un espacio después del texto
        const needsSpaceAfter = this.needsSpaceAfter(text, textAfterCursor);
        
        // Construir el texto final con espaciado apropiado
        let finalText = text.trim(); // Limpiar espacios extra del texto dictado
        
        if (needsSpaceBefore) {
            finalText = ' ' + finalText;
        }
        
        if (needsSpaceAfter) {
            finalText = finalText + ' ';
        }
        
        console.log(`Espaciado: "${text}" → "${finalText}" (antes: ${needsSpaceBefore}, después: ${needsSpaceAfter})`);
        return finalText;
    }

    needsSpaceBefore(textBefore, newText) {
        // Determinar si necesitamos un espacio antes del nuevo texto
        // NUEVA LÓGICA: Si el cursor está delante de un símbolo, NO poner espacio
        
        console.log(`🔍 ESPACIO: Analizando textBefore: "${textBefore}"`);
        
        // Si no hay texto antes, no necesitamos espacio (inicio de documento)
        if (!textBefore || textBefore.length === 0) {
            console.log('🔍 ESPACIO: No hay texto antes - sin espacio');
            return false;
        }
        
        // Si el texto antes ya termina con espacio, no necesitamos otro
        if (textBefore.endsWith(' ') || textBefore.endsWith('\n') || textBefore.endsWith('\t')) {
            console.log('🔍 ESPACIO: Ya termina con espacio - sin espacio');
            return false;
        }
        
        // NUEVA FUNCIONALIDAD: Detectar si el cursor está justo después de un símbolo
        const lastChar = textBefore.slice(-1);
        const symbols = [',', '.', '!', '?', ';', ':', '"', "'", ')', ']', '}', '>', '-', '—'];
        
        if (symbols.includes(lastChar)) {
            console.log(`🔍 ESPACIO: Cursor después del símbolo "${lastChar}" - SIN espacio`);
            return false; // NO poner espacio, pegar la palabra al símbolo
        }
        
        // Si el nuevo texto empieza con puntuación, no necesitamos espacio
        const punctuationStart = /^[.,;:!?'")\]}>]/;
        if (punctuationStart.test(newText.trim())) {
            console.log('🔍 ESPACIO: Nuevo texto empieza con puntuación - sin espacio');
            return false;
        }
        
        // En todos los otros casos, necesitamos espacio antes
        console.log('🔍 ESPACIO: Caso normal - CON espacio');
        return true;
    }

    needsSpaceAfter(newText, textAfter) {
        // Determinar si necesitamos un espacio después del nuevo texto
        
        // Si no hay texto después, siempre agregar espacio para la siguiente palabra
        if (!textAfter || textAfter.length === 0) {
            return true;
        }
        
        // Si el texto después ya empieza con espacio, no necesitamos otro
        if (textAfter.startsWith(' ') || textAfter.startsWith('\n') || textAfter.startsWith('\t')) {
            return false;
        }
        
        // Si el nuevo texto termina con puntuación que no requiere espacio después
        const punctuationEnd = /[.,;:!?'"(\[{<]$/;
        if (punctuationEnd.test(newText.trim())) {
            // Para algunos signos no necesitamos espacio después
            const noSpaceAfter = /['"(\[{<]$/;
            if (noSpaceAfter.test(newText.trim())) {
                return false;
            }
        }
        
        // Si el texto después empieza con puntuación, no necesitamos espacio
        const punctuationAfterStart = /^[.,;:!?'")\]}>]/;
        if (punctuationAfterStart.test(textAfter)) {
            return false;
        }
        
        // En la mayoría de casos, necesitamos espacio después
        return true;
    }

    handleManualInput(event) {
        // Manejar la entrada manual del usuario para capitalización y espaciado automático
        
        console.log('🔍 handleManualInput llamado:', event.inputType, 'data:', event.data);
        
        // Solo procesar si no estamos dictando (para evitar interferencias)
        if (this.isListening) {
            console.log('⏸️ Ignorando - está dictando');
            return;
        }
        
        const textarea = this.textOutput;
        const cursorPosition = textarea.selectionStart;
        const text = textarea.value;
        
        // Verificar si el usuario acaba de escribir un carácter
        const inputType = event.inputType;
        
        console.log(`📝 Procesando: inputType="${inputType}", data="${event.data}", cursor=${cursorPosition}`);
        
        // Si insertó texto (escribió algo)
        if (inputType === 'insertText' || inputType === 'insertCompositionText') {
            const insertedData = event.data;
            
            console.log(`✏️ Texto insertado: "${insertedData}"`);
            
            // NUEVA FUNCIONALIDAD: Detectar signos de puntuación y agregar espacio automático
            if (this.isPunctuationThatNeedsSpace(insertedData)) {
                console.log(`🔤 Signo detectado: "${insertedData}" - agregando espacio automático`);
                
                // Obtener el texto actualizado después de que se insertó el signo
                setTimeout(() => {
                    const updatedText = textarea.value;
                    const currentPos = textarea.selectionStart;
                    
                    console.log(`📍 Texto después del signo: "${updatedText}", cursor en: ${currentPos}`);
                    
                    // Verificar si ya hay espacio después del signo
                    const charAfterSign = updatedText.charAt(currentPos);
                    
                    console.log(`🔍 Carácter después del cursor: "${charAfterSign}"`);
                    
                    if (charAfterSign !== ' ') {
                        // Insertar espacio después del cursor actual
                        const beforeCursor = updatedText.substring(0, currentPos);
                        const afterCursor = updatedText.substring(currentPos);
                        textarea.value = beforeCursor + ' ' + afterCursor;
                        
                        // Mover cursor DESPUÉS del espacio agregado
                        const newPosition = currentPos + 1;
                        textarea.setSelectionRange(newPosition, newPosition);
                        
                        console.log(`✅ Espacio agregado después de "${insertedData}" - cursor en posición ${newPosition}`);
                        console.log(`📝 Texto final: "${textarea.value}"`);
                    } else {
                        console.log(`ℹ️ Ya hay espacio después de "${insertedData}"`);
                    }
                }, 10); // Pequeño delay para que el input se procese primero
            }
            
            // Si escribió un espacio después de un punto, aplicar capitalización a la siguiente palabra
            if (insertedData === ' ') {
                this.checkAndCapitalizeNextWord(cursorPosition);
            }
        }
        
        console.log(`Entrada manual procesada: ${inputType}, datos: "${event.data}"`);
    }

    isPunctuationThatNeedsSpace(char) {
        // Signos de puntuación en español que necesitan espacio después
        // Según las reglas que proporcionaste:
        const spanishPunctuation = [
            ',',  // coma: siempre espacio después
            '.',  // punto: siempre espacio después
            ';',  // punto y coma: siempre espacio después  
            ':',  // dos puntos: siempre espacio después
            '!',  // exclamación: espacio después
            '?'   // interrogación: espacio después
        ];
        
        return spanishPunctuation.includes(char);
    }

    addSpaceAfterPunctuation(punctuation) {
        // Método directo para agregar espacio después de signos de puntuación
        console.log(`🔤 Agregando espacio después de "${punctuation}"`);
        
        const textarea = this.textOutput;
        const cursorPos = textarea.selectionStart;
        const text = textarea.value;
        
        console.log(`📍 Estado actual: texto="${text}", cursor=${cursorPos}`);
        
        // Verificar si ya hay espacio después del cursor
        const charAfter = text.charAt(cursorPos);
        
        if (charAfter !== ' ') {
            // Insertar espacio en la posición actual del cursor
            const beforeCursor = text.substring(0, cursorPos);
            const afterCursor = text.substring(cursorPos);
            
            textarea.value = beforeCursor + ' ' + afterCursor;
            
            // Mover cursor después del espacio
            const newPos = cursorPos + 1;
            textarea.setSelectionRange(newPos, newPos);
            
            console.log(`✅ Espacio agregado! Nuevo texto: "${textarea.value}", cursor en: ${newPos}`);
        } else {
            console.log(`ℹ️ Ya hay espacio después de "${punctuation}"`);
        }
    }

    checkAndCapitalizeNextWord(cursorPosition) {
        // Verificar si necesitamos capitalizar la próxima palabra que se escriba
        const textarea = this.textOutput;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        
        // Si hay un patrón de fin de oración antes del cursor
        const sentenceEndPattern = /[.!?:;]\s+$/;
        if (sentenceEndPattern.test(textBeforeCursor)) {
            // Marcar que la próxima palabra debe capitalizarse
            this.nextWordShouldCapitalize = true;
            console.log('Próxima palabra será capitalizada');
        }
    }

    updateStatus(text, icon) {
        console.log('Actualizando estado:', text, icon); // Debug
        this.statusText.textContent = text;
        this.statusIcon.textContent = icon;
        
        // Forzar actualización visual
        this.statusIcon.innerHTML = icon;
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
            this.lastResultIndex = 0; // Resetear índice
            this.updateWordCount();
            this.focusTextArea(); // Mantener el foco después de limpiar
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

        // Diccionario expandido de correcciones
        const corrections = {
            // Errores básicos
            'ola': 'hola',
            'chola': 'hola',
            'cmo': 'cómo',
            'como': 'cómo',
            'aver': 'haber',
            'haber': 'a ver',
            'valla': 'vaya',
            'baya': 'vaya', 
            'echo': 'hecho',
            'asta': 'hasta',
            'ay': 'ahí',
            'hai': 'ahí',
            'ahi': 'ahí',
            'mas': 'más',
            'por que': 'porque',
            'porque': 'por qué',
            'ke': 'que',
            'q': 'que',
            'xq': 'por qué',
            'pq': 'por qué',
            
            // Correcciones de tu ejemplo
            'orrector': 'corrector',
            'ortografico': 'ortográfico',
            'camion': 'camión',
            'subiré': 'subiré',
            'playa': 'playa',
            
            // Errores comunes adicionales
            'tambien': 'también',
            'aqui': 'aquí',
            'alla': 'allá',
            'solo': 'sólo',
            'esta': 'está',
            'estas': 'estás',
            'estoy': 'estoy',
            'si': 'sí',
            'tu': 'tú',
            'el': 'él',
            'mi': 'mí',
            'te': 'té',
            'se': 'sé',
            'de': 'dé',
            'mas': 'más',
            'aun': 'aún',
            'quien': 'quién',
            'cuando': 'cuándo',
            'donde': 'dónde',
            'que': 'qué',
            
            // Errores de escritura rápida
            'estuvo': 'estuvo',
            'estuve': 'estuve',
            'hacia': 'hacía',
            'asia': 'hacia',
            'veces': 'veces',
            'beses': 'veces',
            'pais': 'país',
            'raiz': 'raíz',
            'maiz': 'maíz',
            'baul': 'baúl',
            
            // Contracciones y abreviaciones
            'xd': 'jajaja',
            'jaja': 'jajaja',
            'ok': 'vale',
            'tmb': 'también',
            'pls': 'por favor',
            'thx': 'gracias'
        };

        // Crear un div temporal editable para mostrar el texto con correcciones marcadas
        this.showSpellCheckMode(text, corrections);
    }

    showSpellCheckMode(text, corrections) {
        // Detectar palabras incorrectas
        const words = text.split(/(\s+)/); // Conservar espacios
        const incorrectWords = [];
        
        words.forEach((word, index) => {
            const cleanWord = word.toLowerCase().trim();
            if (cleanWord && corrections[cleanWord]) {
                incorrectWords.push({
                    index: index,
                    original: word,
                    suggestion: corrections[cleanWord],
                    position: text.indexOf(word)
                });
            }
        });

        if (incorrectWords.length === 0) {
            this.showToast('No se encontraron errores ortográficos', 'info');
            return;
        }

        // Mostrar modo de corrección
        this.createSpellCheckInterface(text, incorrectWords, corrections);
    }

    createSpellCheckInterface(text, incorrectWords, corrections) {
        // Crear overlay de corrección
        const overlay = document.createElement('div');
        overlay.className = 'spell-check-overlay';
        overlay.innerHTML = `
            <div class="spell-check-modal">
                <div class="spell-check-header">
                    <h3>🔍 Corrector Ortográfico</h3>
                    <p>Se encontraron ${incorrectWords.length} errores. Haz clic derecho en las palabras rojas para corregir.</p>
                </div>
                <div class="spell-check-content" id="spellCheckContent"></div>
                <div class="spell-check-actions">
                    <button id="acceptAllBtn" class="control-btn success">✅ Aceptar Todas</button>
                    <button id="cancelSpellBtn" class="control-btn secondary">❌ Cancelar</button>
                </div>
            </div>
        `;

        // Crear texto con palabras marcadas
        const contentDiv = overlay.querySelector('#spellCheckContent');
        let markedText = text;
        
        // Marcar palabras incorrectas (en orden inverso para no afectar posiciones)
        incorrectWords.reverse().forEach((item, index) => {
            const before = markedText.substring(0, item.position);
            const after = markedText.substring(item.position + item.original.length);
            markedText = before + 
                       `<span class="incorrect-word" data-original="${item.original}" data-suggestion="${item.suggestion}" data-index="${index}">${item.original}</span>` + 
                       after;
        });
        
        contentDiv.innerHTML = `<div class="editable-text" contenteditable="false">${markedText}</div`;

        // Agregar eventos
        this.setupSpellCheckEvents(overlay, incorrectWords, corrections);
        
        // Mostrar overlay
        document.body.appendChild(overlay);
    }

    setupSpellCheckEvents(overlay, incorrectWords, corrections) {
        const content = overlay.querySelector('.editable-text');
        
        // Menú contextual personalizado
        let contextMenu = null;
        
        // Evento de clic derecho en palabras incorrectas
        content.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const target = e.target;
            if (target.classList.contains('incorrect-word')) {
                this.showContextMenu(e, target, corrections);
            }
        });

        // Botón aceptar todas las correcciones
        overlay.querySelector('#acceptAllBtn').addEventListener('click', () => {
            let correctedText = this.textOutput.value;
            let totalCorrections = 0;
            
            Object.keys(corrections).forEach(wrong => {
                const regex = new RegExp('\\b' + wrong + '\\b', 'gi');
                const matches = correctedText.match(regex);
                if (matches) {
                    correctedText = correctedText.replace(regex, corrections[wrong]);
                    totalCorrections += matches.length;
                }
            });
            
            this.textOutput.value = correctedText;
            this.updateWordCount();
            this.focusTextArea(); // Mantener foco después de correcciones
            this.showToast(`${totalCorrections} correcciones aplicadas`, 'success');
            
            document.body.removeChild(overlay);
        });

        // Botón cancelar
        overlay.querySelector('#cancelSpellBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        });
    }

    showContextMenu(event, target, corrections) {
        // Eliminar menú previo si existe
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const original = target.dataset.original.toLowerCase();
        const suggestion = corrections[original];
        
        // Crear menú contextual
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="replace">
                ✅ Cambiar por "<strong>${suggestion}</strong>"
            </div>
            <div class="context-menu-item" data-action="ignore">
                🚫 Ignorar
            </div>
            <div class="context-menu-item" data-action="add">
                ➕ Agregar al diccionario
            </div>
        `;

        // Posicionar menú
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        document.body.appendChild(menu);

        // Eventos del menú
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            switch(action) {
                case 'replace':
                    target.textContent = suggestion;
                    target.classList.remove('incorrect-word');
                    target.classList.add('corrected-word');
                    this.showToast(`Cambiado "${original}" por "${suggestion}"`, 'success');
                    break;
                case 'ignore':
                    target.classList.remove('incorrect-word');
                    target.classList.add('ignored-word');
                    this.showToast(`Ignorado "${original}"`, 'info');
                    break;
                case 'add':
                    target.classList.remove('incorrect-word');
                    target.classList.add('added-word');
                    this.showToast(`"${original}" agregado al diccionario`, 'info');
                    break;
            }
            
            menu.remove();
        });

        // Cerrar menú al hacer clic fuera
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                if (menu.parentNode) {
                    menu.remove();
                }
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = 'toast ' + type + ' show';
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
    
    testMicrophone() {
        this.showToast('Probando micrófono...', 'info');
        
        // Test de acceso al micrófono
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    this.showToast('✅ Micrófono accesible', 'success');
                    console.log('Micrófono funcionando correctamente');
                    
                    // Información del navegador
                    console.log('Navegador:', navigator.userAgent);
                    console.log('Idioma del navegador:', navigator.language);
                    console.log('Idiomas disponibles:', navigator.languages);
                    
                    // Test de Speech Recognition
                    if (this.recognition) {
                        console.log('Speech Recognition disponible');
                        console.log('Idioma configurado:', this.recognition.lang);
                        console.log('Continuo:', this.recognition.continuous);
                        console.log('Resultados intermedios:', this.recognition.interimResults);
                        
                        this.textOutput.value += `\n--- DIAGNÓSTICO ---\n`;
                        this.textOutput.value += `Navegador: ${navigator.userAgent.split(' ').pop()}\n`;
                        this.textOutput.value += `Idioma: ${navigator.language}\n`;
                        this.textOutput.value += `Reconocimiento: ${this.recognition.lang}\n`;
                        this.textOutput.value += `Soporte: SpeechRecognition ✅\n`;
                        this.textOutput.value += `--- FIN DIAGNÓSTICO ---\n\n`;
                    } else {
                        this.showToast('❌ Speech Recognition no disponible', 'error');
                    }
                    
                    // Cerrar el stream
                    stream.getTracks().forEach(track => track.stop());
                })
                .catch(error => {
                    console.error('Error de micrófono:', error);
                    this.showToast('❌ Error de micrófono: ' + error.message, 'error');
                });
        } else {
            this.showToast('❌ MediaDevices no soportado', 'error');
        }
    }

    testCursorPosition() {
        // Función de prueba directa del espaciado automático
        this.showToast('🧪 Prueba directa de espaciado automático', 'info');
        console.log('🧪 === INICIO DE PRUEBA DE ESPACIADO AUTOMÁTICO ===');
        
        // Limpiar y poner texto base
        this.textOutput.value = 'Hola mundo';
        this.textOutput.focus();
        this.setCursorToEnd();
        
        setTimeout(() => {
            console.log('🧪 Estado inicial:', this.textOutput.value);
            console.log('🧪 Posición inicial del cursor:', this.textOutput.selectionStart);
            
            // Simular agregar coma manualmente
            this.textOutput.value += ',';
            this.textOutput.setSelectionRange(this.textOutput.value.length, this.textOutput.value.length);
            
            console.log('🧪 Después de agregar coma:', this.textOutput.value);
            console.log('🧪 Cursor en:', this.textOutput.selectionStart);
            
            // Llamar directamente a la función de espaciado
            this.addSpaceAfterPunctuation(',');
            
            setTimeout(() => {
                console.log('🧪 Resultado final:', this.textOutput.value);
                console.log('🧪 Cursor final en:', this.textOutput.selectionStart);
                this.showToast(`✅ Resultado: "${this.textOutput.value}"`, 'success');
            }, 100);
            
        }, 1000);
        
        // También probar con evento real
        setTimeout(() => {
            console.log('🧪 Ahora prueba escribiendo manualmente una coma o punto al final del texto');
            this.showToast('🔤 Prueba manual: escribe , . ; : ! ? al final y verás el espaciado automático', 'info');
        }, 3000);
        
        console.log('🧪 TEST: Función de espaciado automático activada - prueba escribir signos de puntuación');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DictafonoApp();
});
        
        // Limpiar y agregar texto de prueba
        this.textOutput.value = 'Hola mundo';
        this.setCursorToEnd();
        
        setTimeout(() => {
            this.showToast('📝 Escribe una coma "," y verás cómo se agrega espacio automático', 'info');
        }, 1000);
        
        setTimeout(() => {
            this.showToast('� Escribe un punto "." y también se agregará espacio automático', 'info');
        }, 3000);
        
        setTimeout(() => {
            this.showToast('✅ Prueba manual: escribe , . ; : ! ? y verás el espaciado automático', 'success');
        }, 5000);
        
        console.log('🧪 TEST: Probando cursor pegado y espaciado automático tras signos');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DictafonoApp();
});
