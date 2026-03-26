[Setup]
AppName=Nexus Agente Auto Discovery
AppVersion=5.0
AppPublisher=Nexus System
DefaultDirName=C:\Nexus.inv
DisableProgramGroupPage=yes
OutputBaseFilename=Nexus_Instalador_v5
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
; Força o instalador a tentar fechar aplicações se puder
CloseApplications=force

[Files]
; O Source deve apontar para o .exe gerado pelo PyInstaller
Source: "C:\Users\Douglas\Downloads\agente\dist\Nexus_Agente.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{commonprograms}\Nexus Agente"; Filename: "{app}\Nexus_Agente.exe"
; A linha do commonstartup foi removida para evitar conflito com o Watchdog

[Run]
; 1. Libera o Windows Defender para não bloquear a automação de C2
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -Command ""Add-MpPreference -ExclusionPath '{app}'"""; Flags: runhidden waituntilterminated

; 2. Cria a Tarefa Agendada para iniciar JUNTO COM O WINDOWS (ONLOGON) com privilégios máximos
Filename: "schtasks"; Parameters: "/Create /SC ONLOGON /TN ""NexusWatchdog"" /TR ""'{app}\Nexus_Agente.exe' --silent"" /RL HIGHEST /F"; Flags: runhidden

; 3. Inicia o agente NORMALMENTE para o técnico fazer a primeira vinculação
Filename: "{app}\Nexus_Agente.exe"; Description: "Abrir Nexus Sentinel para Cadastro"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Remove a tarefa agendada do Windows quando o sistema for desinstalado
Filename: "schtasks"; Parameters: "/Delete /TN ""NexusWatchdog"" /F"; Flags: runhidden

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    // 1. Desativa temporariamente para ele não reviver o Agente enquanto instalamos
    Exec('schtasks', '/Change /TN "NexusWatchdog" /Disable', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 2. Mata o processo do Agente com força bruta (/F) e toda a sua árvore (/T)
    Exec('cmd.exe', '/c taskkill /F /IM Nexus_Agente.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;