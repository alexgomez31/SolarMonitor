@echo off
echo Iniciando Backend (Flask)...
start cmd /k "cd app\backend && .\venv\Scripts\activate && python app.py"

echo Iniciando Frontend (React + Vite)...
start cmd /k "cd app && npm run dev"

echo ==============================================
echo ¡Proyecto SolarMonitor iniciando!
echo El frontend se abrira pronto en tu navegador.
echo ==============================================
