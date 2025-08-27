# Dictáfono – Voz a Texto

Aplicación de dictado (voz → texto) con corrección y personalización. Ahora empaquetable como APK (Cordova) o ejecutable como PWA ligera.

## Funciones principales
* Reconocimiento de voz (Web Speech API o plugin Cordova)
* Auto-capitalización y puntuación auxiliar (coma automática opcional)
* Corrección automática (LanguageTool – español) con listado de no resueltas
* Archivado local (IndexedDB) + carga / borrado
* Guardado automático de borrador (localStorage)
* Panel de emojis con categorías y búsqueda
* Temas de aplicación y temas de botones (CSS variables)
* Panel de estilo de texto (fuente, tamaño, color, interlineado, cursiva, negrita)
* Tooltips, toasts, contador de palabras dinámico

## Estructura clave
```
index.html
styles.css
script_limpio.js
config.xml (Cordova)
package.json
.github/workflows/android-build.yml (acción para compilar APK)
```

## Ejecución como PWA local
Abrir `index.html` en Chrome/Edge (HTTPS recomendado para reconocimiento estable). Conceder permiso de micrófono.

## Empaquetado Android (APK) con GitHub Actions
1. Haz push a la rama `main` (o `master`).
2. La acción `build-android-apk` generará un artefacto: APK release (sin firmar) en la pestaña *Actions*.
3. Descarga el artefacto, firma si deseas (apksigner / jarsigner) y luego instala en el dispositivo.

### Compilar localmente
Requisitos: Node 18+, Java 17+, Android SDK, Gradle (CLI de Cordova lo gestiona).

```bash
npm install -g cordova@12
npm install
npm run build:cordova
```
APK generado: `platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Firma rápida (ejemplo)
```bash
# Generar keystore (solo una vez)
keytool -genkey -v -keystore dictafono.keystore -alias dictafono -keyalg RSA -keysize 2048 -validity 10000

# Firmar
apksigner sign --ks dictafono.keystore platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk

# (Opcional) Verificar
apksigner verify platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Reconocimiento de voz en Cordova
Se usa `cordova-plugin-speechrecognition` como fallback cuando la Web Speech API no está disponible. Permisos solicitados al inicio.

## Notas de color / estilos en navegadores
Algunos navegadores internos (WebView heredada) pueden renderizar tonos distintos por gestión de color. Las variables CSS permiten ajustar rápidamente.

## Mejoras futuras sugeridas
* Motor Whisper remoto/opcional
* Corrección incremental y resaltado inline
* Refactor modular en ES Modules
* Snapshots de versiones de borrador
* Atajos de teclado configurables

## Licencia
MIT (ajusta según tus necesidades)
# dictafono_pro_v1
